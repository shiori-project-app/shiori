import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readVideoResolution } from '../../electron/videoResolutionReader.js';

const MATROSKA_ID = {
  ebml: [0x1a, 0x45, 0xdf, 0xa3],
  segment: [0x18, 0x53, 0x80, 0x67],
  info: [0x15, 0x49, 0xa9, 0x66],
  tracks: [0x16, 0x54, 0xae, 0x6b],
  cluster: [0x1f, 0x43, 0xb6, 0x75],
  trackEntry: [0xae],
  trackType: [0x83],
  video: [0xe0],
  pixelWidth: [0xb0],
  pixelHeight: [0xba],
  displayWidth: [0x54, 0xb0],
  displayHeight: [0x54, 0xba],
  displayUnit: [0x54, 0xb2],
};

const DISPLAY_UNIT_CENTIMETRES = 1;
const DISPLAY_UNIT_ASPECT_RATIO = 3;

const UNKNOWN_SIZE = Buffer.from([0x01, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]);
const VIDEO_TRACK_TYPE = 1;
const AUDIO_TRACK_TYPE = 2;

const sizeField = (size) => {
  const bytes = Buffer.alloc(8);

  bytes.writeBigUInt64BE(BigInt(size));
  bytes[0] = 0x01;

  return bytes;
};

const element = (id, ...contents) => {
  const body = Buffer.concat(contents.map((content) => Buffer.from(content)));

  return Buffer.concat([Buffer.from(id), sizeField(body.length), body]);
};

const unsignedBytes = (value) => {
  const bytes = Buffer.alloc(2);

  bytes.writeUInt16BE(value);

  return bytes;
};

const matroskaVideoTrack = (width, height) =>
  element(
    MATROSKA_ID.trackEntry,
    element(MATROSKA_ID.trackType, [VIDEO_TRACK_TYPE]),
    element(
      MATROSKA_ID.video,
      element(MATROSKA_ID.pixelWidth, unsignedBytes(width)),
      element(MATROSKA_ID.pixelHeight, unsignedBytes(height)),
    ),
  );

const matroskaVideoTrackWithDisplaySize = (pixelSize, displaySize, displayUnit) =>
  element(
    MATROSKA_ID.trackEntry,
    element(MATROSKA_ID.trackType, [VIDEO_TRACK_TYPE]),
    element(
      MATROSKA_ID.video,
      element(MATROSKA_ID.pixelWidth, unsignedBytes(pixelSize.width)),
      element(MATROSKA_ID.pixelHeight, unsignedBytes(pixelSize.height)),
      element(MATROSKA_ID.displayWidth, unsignedBytes(displaySize.width)),
      element(MATROSKA_ID.displayHeight, unsignedBytes(displaySize.height)),
      ...(displayUnit === undefined ? [] : [element(MATROSKA_ID.displayUnit, [displayUnit])]),
    ),
  );

const matroskaAudioTrack = () => element(MATROSKA_ID.trackEntry, element(MATROSKA_ID.trackType, [AUDIO_TRACK_TYPE]));

const matroskaFile = (...segmentContents) =>
  Buffer.concat([
    element(MATROSKA_ID.ebml, Buffer.alloc(4)),
    Buffer.from(MATROSKA_ID.segment),
    UNKNOWN_SIZE,
    ...segmentContents,
  ]);

const box = (type, ...contents) => {
  const body = Buffer.concat(contents);
  const header = Buffer.alloc(8);

  header.writeUInt32BE(body.length + 8);
  header.write(type, 4, 'latin1');

  return Buffer.concat([header, body]);
};

const largeSizeBox = (type, bodyLength) => {
  const header = Buffer.alloc(16);

  header.writeUInt32BE(1);
  header.write(type, 4, 'latin1');
  header.writeBigUInt64BE(BigInt(bodyLength + 16), 8);

  return Buffer.concat([header, Buffer.alloc(bodyLength)]);
};

const boxReachingEndOfFile = (type, bodyLength) => {
  const header = Buffer.alloc(8);

  header.write(type, 4, 'latin1');

  return Buffer.concat([header, Buffer.alloc(bodyLength)]);
};

const trackHeaderBox = (width, height, version = 0, isEnabled = true) => {
  const widthOffset = version === 1 ? 88 : 76;
  const body = Buffer.alloc(widthOffset + 8);

  body[0] = version;
  body[3] = isEnabled ? 1 : 0;
  body.writeUInt32BE(width * 65536, widthOffset);
  body.writeUInt32BE(height * 65536, widthOffset + 4);

  return box('tkhd', body);
};

const handlerBox = (handlerType) => {
  const body = Buffer.alloc(24);

  body.write(handlerType, 8, 'latin1');

  return box('hdlr', body);
};

const movieTrack = (handlerType, width, height, version, isEnabled) =>
  box('trak', trackHeaderBox(width, height, version, isEnabled), box('mdia', handlerBox(handlerType)));

const disabledMovieTrack = (width, height) => movieTrack('vide', width, height, 0, false);

const boxHeaderDeclaring = (type, totalSize) => {
  const header = Buffer.alloc(8);

  header.writeUInt32BE(totalSize);
  header.write(type, 4, 'latin1');

  return header;
};

const largestAllocationWhile = async (read) => {
  const alloc = vi.spyOn(Buffer, 'alloc');

  await read();

  return Math.max(...alloc.mock.calls.map(([size]) => size));
};

const THIRTY_TWO_MEGABYTES = 32 * 1024 * 1024;
const ONE_MEGABYTE = 1024 * 1024;

const fileType = () => box('ftyp', Buffer.from('isom'));

describe('readVideoResolution', () => {
  let testFolder;

  const resolutionOf = (bytes, name = 'video.bin') => {
    const filePath = path.join(testFolder, name);

    fs.writeFileSync(filePath, bytes);

    return readVideoResolution(filePath);
  };

  beforeEach(() => {
    testFolder = fs.mkdtempSync(path.join(os.tmpdir(), 'shiori-resolution-'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(testFolder, { recursive: true, force: true });
  });

  describe('Matroska', () => {
    it('reads the video track and ignores audio tracks', async () => {
      const file = matroskaFile(
        element(MATROSKA_ID.tracks, matroskaAudioTrack(), matroskaVideoTrack(1920, 1080)),
        element(MATROSKA_ID.cluster, Buffer.alloc(32)),
      );

      expect(await resolutionOf(file)).toEqual({ width: 1920, height: 1080 });
    });

    it('skips other elements before the tracks', async () => {
      const file = matroskaFile(
        element(MATROSKA_ID.info, Buffer.alloc(200)),
        element(MATROSKA_ID.tracks, matroskaVideoTrack(1280, 720)),
      );

      expect(await resolutionOf(file)).toEqual({ width: 1280, height: 720 });
    });

    it('reports the display size, as MP4 does, when it’s given in pixels', async () => {
      const anamorphicTrack = matroskaVideoTrackWithDisplaySize(
        { width: 720, height: 480 },
        { width: 853, height: 480 },
      );

      expect(await resolutionOf(matroskaFile(element(MATROSKA_ID.tracks, anamorphicTrack)))).toEqual({
        width: 853,
        height: 480,
      });
    });

    it('widens the stored size to the display aspect ratio, as MP4 does', async () => {
      const anamorphicTrack = matroskaVideoTrackWithDisplaySize(
        { width: 720, height: 480 },
        { width: 16, height: 9 },
        DISPLAY_UNIT_ASPECT_RATIO,
      );

      expect(await resolutionOf(matroskaFile(element(MATROSKA_ID.tracks, anamorphicTrack)))).toEqual({
        width: 853,
        height: 480,
      });
    });

    it('keeps the stored size when the display size is in a physical unit', async () => {
      const centimetreTrack = matroskaVideoTrackWithDisplaySize(
        { width: 1920, height: 1080 },
        { width: 32, height: 18 },
        DISPLAY_UNIT_CENTIMETRES,
      );

      expect(await resolutionOf(matroskaFile(element(MATROSKA_ID.tracks, centimetreTrack)))).toEqual({
        width: 1920,
        height: 1080,
      });
    });

    it('gives up at the first cluster rather than walking the whole file', async () => {
      const file = matroskaFile(
        element(MATROSKA_ID.cluster, Buffer.alloc(32)),
        element(MATROSKA_ID.tracks, matroskaVideoTrack(1280, 720)),
      );

      expect(await resolutionOf(file)).toBeNull();
    });

    it('returns null when no track has a size', async () => {
      const file = matroskaFile(element(MATROSKA_ID.tracks, matroskaAudioTrack()));

      expect(await resolutionOf(file)).toBeNull();
    });

    it('doesn’t allocate what a cut-off file only claims to hold', async () => {
      const file = Buffer.concat([
        element(MATROSKA_ID.ebml, Buffer.alloc(4)),
        Buffer.from(MATROSKA_ID.segment),
        UNKNOWN_SIZE,
        Buffer.from(MATROSKA_ID.tracks),
        sizeField(THIRTY_TWO_MEGABYTES),
        Buffer.alloc(64),
      ]);

      expect(await largestAllocationWhile(() => resolutionOf(file))).toBeLessThan(ONE_MEGABYTE);
    });

    it('survives a file cut off inside the tracks', async () => {
      const file = matroskaFile(element(MATROSKA_ID.tracks, matroskaVideoTrack(1920, 1080)));

      expect(await resolutionOf(file.subarray(0, file.length - 12))).toBeNull();
    });
  });

  describe('MP4 and MOV', () => {
    it('reads the video track and ignores sound tracks', async () => {
      const file = Buffer.concat([
        fileType(),
        box('moov', movieTrack('soun', 0, 0), movieTrack('vide', 1280, 720)),
        box('mdat', Buffer.alloc(32)),
      ]);

      expect(await resolutionOf(file)).toEqual({ width: 1280, height: 720 });
    });

    it('finds the metadata after the video data', async () => {
      const file = Buffer.concat([
        fileType(),
        box('mdat', Buffer.alloc(4096)),
        box('moov', movieTrack('vide', 1920, 1080)),
      ]);

      expect(await resolutionOf(file)).toEqual({ width: 1920, height: 1080 });
    });

    it('skips a video data box with a 64-bit size', async () => {
      const file = Buffer.concat([fileType(), largeSizeBox('mdat', 4096), box('moov', movieTrack('vide', 1920, 1080))]);

      expect(await resolutionOf(file)).toEqual({ width: 1920, height: 1080 });
    });

    it('reads track headers that use 64-bit times', async () => {
      const file = Buffer.concat([fileType(), box('moov', movieTrack('vide', 854, 480, 1))]);

      expect(await resolutionOf(file)).toEqual({ width: 854, height: 480 });
    });

    it('picks the largest video track when there is also a thumbnail track', async () => {
      const file = Buffer.concat([
        fileType(),
        box('moov', movieTrack('vide', 320, 180), movieTrack('vide', 1920, 1080)),
      ]);

      expect(await resolutionOf(file)).toEqual({ width: 1920, height: 1080 });
    });

    it('ignores a disabled track larger than the video, such as cover art', async () => {
      const file = Buffer.concat([
        fileType(),
        box('moov', movieTrack('vide', 1280, 720), disabledMovieTrack(3000, 3000)),
      ]);

      expect(await resolutionOf(file)).toEqual({ width: 1280, height: 720 });
    });

    it('uses disabled tracks when no track is enabled', async () => {
      const file = Buffer.concat([fileType(), box('moov', disabledMovieTrack(1280, 720))]);

      expect(await resolutionOf(file)).toEqual({ width: 1280, height: 720 });
    });

    it('uses a disabled track when the enabled one has no size', async () => {
      const file = Buffer.concat([fileType(), box('moov', movieTrack('vide', 0, 0), disabledMovieTrack(1280, 720))]);

      expect(await resolutionOf(file)).toEqual({ width: 1280, height: 720 });
    });

    it('doesn’t allocate what a cut-off file only claims to hold', async () => {
      const file = Buffer.concat([fileType(), boxHeaderDeclaring('moov', THIRTY_TWO_MEGABYTES), Buffer.alloc(64)]);

      expect(await largestAllocationWhile(() => resolutionOf(file))).toBeLessThan(ONE_MEGABYTE);
    });

    it('reads files that have no file type box', async () => {
      expect(await resolutionOf(box('moov', movieTrack('vide', 1280, 720)))).toEqual({ width: 1280, height: 720 });
    });

    it('returns null when the video data runs to the end and hides the metadata', async () => {
      expect(await resolutionOf(Buffer.concat([fileType(), boxReachingEndOfFile('mdat', 64)]))).toBeNull();
    });

    it('returns null when the video track has no size', async () => {
      const file = Buffer.concat([fileType(), box('moov', movieTrack('vide', 0, 0))]);

      expect(await resolutionOf(file)).toBeNull();
    });

    it('returns null for a track header cut short', async () => {
      const shortTrack = box('trak', box('tkhd', Buffer.alloc(20)), box('mdia', handlerBox('vide')));

      expect(await resolutionOf(Buffer.concat([fileType(), box('moov', shortTrack)]))).toBeNull();
    });
  });

  it.each([
    ['an empty file', Buffer.alloc(0)],
    ['a tiny file', Buffer.from([0x00, 0x01])],
    ['text', Buffer.from('this is not a video at all, just some words in a file')],
    [
      'an AVI file',
      Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4, 0xff), Buffer.from('AVI LIST'), Buffer.alloc(64)]),
    ],
    ['zeroes', Buffer.alloc(4096)],
  ])('returns null for %s', async (_name, bytes) => {
    expect(await resolutionOf(bytes)).toBeNull();
  });

  const spyOnFileClosing = () => {
    const openFile = fs.promises.open;
    const closeSpies = [];

    vi.spyOn(fs.promises, 'open').mockImplementation(async (...openArguments) => {
      const handle = await openFile(...openArguments);

      closeSpies.push(vi.spyOn(handle, 'close'));

      return handle;
    });

    return closeSpies;
  };

  it('closes the file after reading', async () => {
    const closeSpies = spyOnFileClosing();

    await resolutionOf(Buffer.concat([fileType(), box('moov', movieTrack('vide', 1280, 720))]));

    expect(closeSpies).toHaveLength(1);
    expect(closeSpies[0]).toHaveBeenCalledTimes(1);
  });

  it('closes the file when reading it fails', async () => {
    const openFile = fs.promises.open;
    const filePath = path.join(testFolder, 'unreadable.mp4');
    let closeSpy;

    vi.spyOn(fs.promises, 'open').mockImplementation(async (...openArguments) => {
      const handle = await openFile(...openArguments);

      vi.spyOn(handle, 'stat').mockRejectedValue(new Error('EIO'));
      closeSpy = vi.spyOn(handle, 'close');

      return handle;
    });

    fs.writeFileSync(filePath, 'bytes');

    await expect(readVideoResolution(filePath)).rejects.toThrow('EIO');
    expect(closeSpy).toHaveBeenCalledTimes(1);
  });

  it('rejects when the file cannot be opened', async () => {
    await expect(readVideoResolution(path.join(testFolder, 'missing.mp4'))).rejects.toThrow();
  });
});
