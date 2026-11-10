import fs from 'node:fs';
import zlib from 'node:zlib';
import {
  childElements,
  findChild,
  MATROSKA_IDS,
  MAX_ELEMENT_HEADER_BYTES,
  MAX_TRACKS_BYTES,
  readElementHeader,
  readElementSize,
  readUnsigned,
} from './ebml.js';

const ELEMENT_IDS = {
  ...MATROSKA_IDS,
  info: 0x1549a966,
  timecodeScale: 0x2ad7b1,
  trackNumber: 0xd7,
  codecId: 0x86,
  codecPrivate: 0x63a2,
  language: 0x22b59c,
  name: 0x536e,
  contentEncodings: 0x6d80,
  contentEncoding: 0x6240,
  contentCompression: 0x5034,
  compressionAlgorithm: 0x4254,
  compressionSettings: 0x4255,
  clusterTimecode: 0xe7,
  blockGroup: 0xa0,
  block: 0xa1,
  blockDuration: 0x9b,
};

const SEQUENTIALLY_READ_ELEMENTS = new Set([
  ELEMENT_IDS.segment,
  ELEMENT_IDS.info,
  ELEMENT_IDS.cluster,
  ELEMENT_IDS.blockGroup,
]);

const SUBTITLE_TRACK_TYPE = 0x11;
const TEXT_CODEC_PREFIX = 'S_TEXT/';
const SSA_TYPES = new Set(['ssa', 'ass']);
const SSA_FIELD_NAMES = ['readOrder', 'layer', 'style', 'name', 'marginL', 'marginR', 'marginV', 'effect'];
const SSA_TEXT_FIELD_INDEX = SSA_FIELD_NAMES.length;
const FIRST_SSA_FIELD_INDEX = { ass: 1, ssa: 2 };
const ZLIB_COMPRESSION = 0;
const HEADER_STRIPPING_COMPRESSION = 3;
const DEFAULT_TIMECODE_SCALE_NANOSECONDS = 1000000;
const NANOSECONDS_PER_MILLISECOND = 1000000;
const BLOCK_HEADER_BYTES = 12;
const MAX_SUBTITLE_BLOCK_BYTES = 16 * 1024 * 1024;
const BLOCK_TIMECODE_BYTES = 2;
const BLOCK_FLAGS_BYTES = 1;
const DEFAULT_READ_WINDOW_BYTES = 4 * 1024 * 1024;

const compressionOf = (trackChildren) => {
  const encodings = findChild(trackChildren, ELEMENT_IDS.contentEncodings);
  const encoding = encodings && findChild(childElements(encodings), ELEMENT_IDS.contentEncoding);
  const compression = encoding && findChild(childElements(encoding), ELEMENT_IDS.contentCompression);

  if (!compression) return null;

  const compressionChildren = childElements(compression);
  const algorithm = findChild(compressionChildren, ELEMENT_IDS.compressionAlgorithm);

  return {
    algorithm: algorithm ? readUnsigned(algorithm) : ZLIB_COMPRESSION,
    settings: findChild(compressionChildren, ELEMENT_IDS.compressionSettings) ?? Buffer.alloc(0),
  };
};

const toSubtitleTrack = (trackChildren) => {
  const trackType = findChild(trackChildren, ELEMENT_IDS.trackType);
  const codecId = findChild(trackChildren, ELEMENT_IDS.codecId)?.toString('utf8') ?? '';

  const number = findChild(trackChildren, ELEMENT_IDS.trackNumber);

  if (!trackType || !number || readUnsigned(trackType) !== SUBTITLE_TRACK_TYPE) return null;
  if (!codecId.startsWith(TEXT_CODEC_PREFIX)) return null;

  return {
    number: readUnsigned(number),
    language: findChild(trackChildren, ELEMENT_IDS.language)?.toString('utf8'),
    name: findChild(trackChildren, ELEMENT_IDS.name)?.toString('utf8'),
    type: codecId.slice(TEXT_CODEC_PREFIX.length).toLowerCase(),
    header: findChild(trackChildren, ELEMENT_IDS.codecPrivate)?.toString('utf8'),
    compression: compressionOf(trackChildren),
    events: [],
  };
};

const parseSubtitleTracks = (tracksBytes) =>
  childElements(tracksBytes)
    .filter(({ id }) => id === ELEMENT_IDS.trackEntry)
    .map(({ data }) => toSubtitleTrack(childElements(data)))
    .filter(Boolean);

const decompressedPayload = (payload, compression) => {
  if (!compression) return payload;

  if (compression.algorithm === ZLIB_COMPRESSION) {
    return zlib.inflateSync(payload, { maxOutputLength: MAX_SUBTITLE_BLOCK_BYTES });
  }

  if (compression.algorithm === HEADER_STRIPPING_COMPRESSION) return Buffer.concat([compression.settings, payload]);

  throw new Error(`Unsupported subtitle compression ${compression.algorithm}`);
};

const withSsaFields = (event, type, text) => {
  const values = text.split(',');

  const fields = Object.fromEntries(
    SSA_FIELD_NAMES.map((fieldName, index) => [fieldName, values[index]]).slice(FIRST_SSA_FIELD_INDEX[type]),
  );

  return { ...event, ...fields, text: values.slice(SSA_TEXT_FIELD_INDEX).join(',') };
};

const textOfPayload = (payload, compression) => {
  try {
    return decompressedPayload(payload, compression).toString('utf8');
  } catch {
    return null;
  }
};

const toSubtitleEvent = (track, payload, timeInMilliseconds) => {
  const text = textOfPayload(payload, track.compression);

  if (text === null) return null;

  const event = { text, time: timeInMilliseconds, duration: 0 };

  return SSA_TYPES.has(track.type) ? withSsaFields(event, track.type, text) : event;
};

const openWindowedFile = async (filePath, windowBytes) => {
  const handle = await fs.promises.open(filePath, 'r');
  const { size } = await handle.stat();

  const windowBuffer = Buffer.allocUnsafe(windowBytes);
  let windowStart = 0;

  let windowLength = 0;

  const bytesAlreadyLoaded = (position, count) =>
    position >= windowStart && position + count <= windowStart + windowLength
      ? windowBuffer.subarray(position - windowStart, position - windowStart + count)
      : null;

  const loadBytes = async (position, count) => {
    if (count > windowBytes) {
      const largeBuffer = Buffer.allocUnsafe(count);
      const { bytesRead } = await handle.read(largeBuffer, 0, count, position);

      return largeBuffer.subarray(0, bytesRead);
    }

    const { bytesRead } = await handle.read(windowBuffer, 0, windowBytes, position);

    windowStart = position;
    windowLength = bytesRead;

    return windowBuffer.subarray(0, Math.min(count, bytesRead));
  };

  return { size, bytesAlreadyLoaded, loadBytes, close: () => handle.close() };
};

const readSubtitlesFromFile = async (file) => {
  let position = 0;
  let timecodeScale = DEFAULT_TIMECODE_SCALE_NANOSECONDS;

  let clusterTimecode = 0;
  let subtitleTracksByNumber = null;

  let eventInGroup = null;
  let durationInGroup = null;

  const toMilliseconds = (timecode) => (timecode * timecodeScale) / NANOSECONDS_PER_MILLISECOND;

  const startBlockGroup = () => {
    eventInGroup = null;
    durationInGroup = null;
  };

  const readBlock = async (start, size) => {
    const header =
      file.bytesAlreadyLoaded(start, BLOCK_HEADER_BYTES) ?? (await file.loadBytes(start, BLOCK_HEADER_BYTES));

    const trackField = readElementSize(header, 0);
    const track = trackField && subtitleTracksByNumber?.get(trackField.value);
    const payloadOffset = trackField && trackField.length + BLOCK_TIMECODE_BYTES + BLOCK_FLAGS_BYTES;

    if (!track || size > MAX_SUBTITLE_BLOCK_BYTES || size < payloadOffset) return;

    const blockBytes = Buffer.from(file.bytesAlreadyLoaded(start, size) ?? (await file.loadBytes(start, size)));
    const relativeTimecode = blockBytes.readInt16BE(trackField.length);

    const event = toSubtitleEvent(
      track,
      blockBytes.subarray(payloadOffset),
      toMilliseconds(clusterTimecode + relativeTimecode),
    );

    if (!event) return;
    if (durationInGroup !== null) event.duration = durationInGroup;

    eventInGroup = event;
    track.events.push(event);
  };

  const readDuration = (bytes) => {
    durationInGroup = toMilliseconds(readUnsigned(bytes));

    if (eventInGroup) eventInGroup.duration = durationInGroup;
  };

  const valueAt = async (start, size) => file.bytesAlreadyLoaded(start, size) ?? file.loadBytes(start, size);

  const readTracksOnce = async (start, size) => {
    if (subtitleTracksByNumber) return;

    const subtitleTracks = parseSubtitleTracks(Buffer.from(await valueAt(start, size)));

    subtitleTracksByNumber = new Map(subtitleTracks.map((track) => [track.number, track]));
  };

  const readersByElementId = {
    [ELEMENT_IDS.timecodeScale]: async (start, size) => {
      timecodeScale = readUnsigned(await valueAt(start, size));
    },

    [ELEMENT_IDS.clusterTimecode]: async (start, size) => {
      clusterTimecode = readUnsigned(await valueAt(start, size));
    },

    [ELEMENT_IDS.block]: readBlock,
    [ELEMENT_IDS.blockDuration]: async (start, size) => readDuration(await valueAt(start, size)),
  };

  while (position < file.size) {
    const headerBytes =
      file.bytesAlreadyLoaded(position, MAX_ELEMENT_HEADER_BYTES) ??
      (await file.loadBytes(position, MAX_ELEMENT_HEADER_BYTES));

    const header = readElementHeader(headerBytes, 0);

    if (!header) break;

    const start = position + header.headerLength;

    if (SEQUENTIALLY_READ_ELEMENTS.has(header.id)) {
      if (header.id === ELEMENT_IDS.blockGroup) startBlockGroup();

      position = start;
      continue;
    }

    if (header.size === null || start + header.size > file.size) break;

    if (header.id === ELEMENT_IDS.tracks) {
      if (header.size > MAX_TRACKS_BYTES) break;

      await readTracksOnce(start, header.size);

      if (subtitleTracksByNumber.size === 0) return [];
    }

    await readersByElementId[header.id]?.(start, header.size);
    position = start + header.size;
  }

  return [...(subtitleTracksByNumber?.values() ?? [])];
};

export const readMkvSubtitleTracks = async (filePath, { windowBytes = DEFAULT_READ_WINDOW_BYTES } = {}) => {
  const file = await openWindowedFile(filePath, windowBytes);

  try {
    return await readSubtitlesFromFile(file);
  } finally {
    await file.close();
  }
};
