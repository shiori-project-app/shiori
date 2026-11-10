import fs from 'node:fs';
import {
  childElements,
  findChild,
  MATROSKA_IDS,
  MAX_ELEMENT_HEADER_BYTES,
  MAX_TRACKS_BYTES,
  readElementHeader,
  readUnsigned,
} from './ebml.js';

const MATROSKA_SIGNATURE = Buffer.from([0x1a, 0x45, 0xdf, 0xa3]);

const MATROSKA_VIDEO_IDS = {
  video: 0xe0,
  pixelWidth: 0xb0,
  pixelHeight: 0xba,
  displayWidth: 0x54b0,
  displayHeight: 0x54ba,
  displayUnit: 0x54b2,
};

const MATROSKA_VIDEO_TRACK_TYPE = 1;
const MATROSKA_DISPLAY_UNIT_PIXELS = 0;
const MATROSKA_DISPLAY_UNIT_ASPECT_RATIO = 3;

const BOX_HEADER_BYTES = 8;
const LARGE_BOX_HEADER_BYTES = 16;
const BOX_REACHES_END_OF_FILE = 0;
const BOX_HAS_LARGE_SIZE = 1;
const VIDEO_HANDLER = 'vide';
const HANDLER_TYPE_START = 8;
const HANDLER_TYPE_END = 12;
const TRACK_HEADER_VERSION_WITH_LONG_TIMES = 1;
const TRACK_FLAGS_LAST_BYTE = 3;
const TRACK_ENABLED_FLAG = 1;
const TRACK_WIDTH_OFFSET = 76;
const TRACK_WIDTH_OFFSET_WITH_LONG_TIMES = 88;
const TRACK_HEIGHT_DISTANCE = 4;
const TRACK_SIZE_FIELDS_BYTES = 8;

const MAX_MOVIE_BOX_BYTES = 64 * 1024 * 1024;
const MAX_TOP_LEVEL_ITEMS = 64;

const readBytesAt = async (handle, position, count) => {
  const bytes = Buffer.alloc(count);
  const { bytesRead } = await handle.read(bytes, 0, count, position);

  return bytes.subarray(0, bytesRead);
};

const readBodyWithinFile = (handle, start, declaredSize, fileSize) =>
  readBytesAt(handle, start, Math.min(declaredSize, fileSize - start));

const areaOf = ({ width, height }) => width * height;

const largestResolution = (resolutions) =>
  resolutions
    .filter((resolution) => resolution && areaOf(resolution) > 0)
    .reduce((largest, resolution) => (!largest || areaOf(resolution) > areaOf(largest) ? resolution : largest), null);

const findMatroskaTracks = async (handle, position, fileSize, itemsLeft) => {
  if (itemsLeft === 0 || position >= fileSize) return null;

  const header = readElementHeader(await readBytesAt(handle, position, MAX_ELEMENT_HEADER_BYTES), 0);

  if (!header || header.id === MATROSKA_IDS.cluster) return null;

  const start = position + header.headerLength;

  if (header.id === MATROSKA_IDS.segment) return findMatroskaTracks(handle, start, fileSize, itemsLeft - 1);
  if (header.size === null) return null;

  if (header.id === MATROSKA_IDS.tracks) {
    return header.size <= MAX_TRACKS_BYTES ? readBodyWithinFile(handle, start, header.size, fileSize) : null;
  }

  return findMatroskaTracks(handle, start + header.size, fileSize, itemsLeft - 1);
};

const matroskaTrackResolution = (trackBytes) => {
  const track = childElements(trackBytes);
  const trackType = findChild(track, MATROSKA_IDS.trackType);
  const video = findChild(track, MATROSKA_VIDEO_IDS.video);

  if (!trackType || !video || readUnsigned(trackType) !== MATROSKA_VIDEO_TRACK_TYPE) return null;

  const videoFields = childElements(video);
  const readField = (id) => readUnsigned(findChild(videoFields, id) ?? []);

  const storedSize = {
    width: readField(MATROSKA_VIDEO_IDS.pixelWidth),
    height: readField(MATROSKA_VIDEO_IDS.pixelHeight),
  };

  const displaySize = {
    width: readField(MATROSKA_VIDEO_IDS.displayWidth),
    height: readField(MATROSKA_VIDEO_IDS.displayHeight),
  };

  if (areaOf(displaySize) === 0) return storedSize;

  const sizeByDisplayUnit = {
    [MATROSKA_DISPLAY_UNIT_PIXELS]: () => displaySize,

    [MATROSKA_DISPLAY_UNIT_ASPECT_RATIO]: () => ({
      width: Math.round((storedSize.height * displaySize.width) / displaySize.height),
      height: storedSize.height,
    }),
  };

  return sizeByDisplayUnit[readField(MATROSKA_VIDEO_IDS.displayUnit)]?.() ?? storedSize;
};

const readMatroskaResolution = async (handle, fileSize) => {
  const tracks = await findMatroskaTracks(handle, 0, fileSize, MAX_TOP_LEVEL_ITEMS);

  if (!tracks) return null;

  return largestResolution(
    childElements(tracks)
      .filter(({ id }) => id === MATROSKA_IDS.trackEntry)
      .map(({ data }) => matroskaTrackResolution(data)),
  );
};

const readBoxHeader = (bytes) => {
  if (bytes.length < BOX_HEADER_BYTES) return null;

  const compactSize = bytes.readUInt32BE(0);
  const type = bytes.toString('latin1', 4, BOX_HEADER_BYTES);

  if (compactSize === BOX_REACHES_END_OF_FILE) return { type, size: null, headerLength: BOX_HEADER_BYTES };

  if (compactSize !== BOX_HAS_LARGE_SIZE) {
    return compactSize >= BOX_HEADER_BYTES ? { type, size: compactSize, headerLength: BOX_HEADER_BYTES } : null;
  }

  if (bytes.length < LARGE_BOX_HEADER_BYTES) return null;

  const largeSize = Number(bytes.readBigUInt64BE(BOX_HEADER_BYTES));

  return largeSize >= LARGE_BOX_HEADER_BYTES ? { type, size: largeSize, headerLength: LARGE_BOX_HEADER_BYTES } : null;
};

const childBoxes = (bytes) => {
  const children = [];
  let offset = 0;

  while (offset < bytes.length) {
    const header = readBoxHeader(bytes.subarray(offset));

    if (!header) break;

    const end = header.size === null ? bytes.length : offset + header.size;

    children.push({ type: header.type, data: bytes.subarray(offset + header.headerLength, end) });
    offset = end;
  }

  return children;
};

const findBox = (boxes, type) => boxes.find((box) => box.type === type)?.data;

const findMovieBox = async (handle, position, fileSize, itemsLeft) => {
  if (itemsLeft === 0 || position >= fileSize) return null;

  const header = readBoxHeader(await readBytesAt(handle, position, LARGE_BOX_HEADER_BYTES));

  if (!header) return null;

  const end = header.size === null ? fileSize : position + header.size;

  if (header.type !== 'moov') return findMovieBox(handle, end, fileSize, itemsLeft - 1);

  const bodySize = end - position - header.headerLength;

  return bodySize <= MAX_MOVIE_BOX_BYTES
    ? readBodyWithinFile(handle, position + header.headerLength, bodySize, fileSize)
    : null;
};

const isVideoTrack = (track) => {
  const media = findBox(track, 'mdia');
  const handler = media && findBox(childBoxes(media), 'hdlr');

  return handler?.toString('latin1', HANDLER_TYPE_START, HANDLER_TYPE_END) === VIDEO_HANDLER;
};

const trackHeaderResolution = (trackHeader) => {
  const widthOffset =
    trackHeader[0] === TRACK_HEADER_VERSION_WITH_LONG_TIMES ? TRACK_WIDTH_OFFSET_WITH_LONG_TIMES : TRACK_WIDTH_OFFSET;

  if (trackHeader.length < widthOffset + TRACK_SIZE_FIELDS_BYTES) return null;

  return {
    width: trackHeader.readUInt16BE(widthOffset),
    height: trackHeader.readUInt16BE(widthOffset + TRACK_HEIGHT_DISTANCE),
    isEnabled: Boolean(trackHeader[TRACK_FLAGS_LAST_BYTE] & TRACK_ENABLED_FLAG),
  };
};

const movieTrackResolution = (trackBytes) => {
  const track = childBoxes(trackBytes);
  const trackHeader = findBox(track, 'tkhd');

  return trackHeader && isVideoTrack(track) ? trackHeaderResolution(trackHeader) : null;
};

const readMovieResolution = async (handle, fileSize) => {
  const movie = await findMovieBox(handle, 0, fileSize, MAX_TOP_LEVEL_ITEMS);

  if (!movie) return null;

  const tracks = childBoxes(movie)
    .filter(({ type }) => type === 'trak')
    .map(({ data }) => movieTrackResolution(data))
    .filter(Boolean);

  const largestTrack = largestResolution(tracks.filter(({ isEnabled }) => isEnabled)) ?? largestResolution(tracks);

  return largestTrack && { width: largestTrack.width, height: largestTrack.height };
};

export const readVideoResolution = async (filePath) => {
  const handle = await fs.promises.open(filePath, 'r');

  try {
    const { size } = await handle.stat();
    const signature = await readBytesAt(handle, 0, MATROSKA_SIGNATURE.length);

    return signature.equals(MATROSKA_SIGNATURE)
      ? await readMatroskaResolution(handle, size)
      : await readMovieResolution(handle, size);
  } finally {
    await handle.close();
  }
};
