import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readMkvSubtitleTracks } from '../../electron/mkvSubtitleReader.js';

const ID = {
  ebml: [0x1a, 0x45, 0xdf, 0xa3],
  segment: [0x18, 0x53, 0x80, 0x67],
  info: [0x15, 0x49, 0xa9, 0x66],
  timecodeScale: [0x2a, 0xd7, 0xb1],
  tracks: [0x16, 0x54, 0xae, 0x6b],
  trackEntry: [0xae],
  trackNumber: [0xd7],
  trackType: [0x83],
  codecId: [0x86],
  codecPrivate: [0x63, 0xa2],
  language: [0x22, 0xb5, 0x9c],
  name: [0x53, 0x6e],
  contentEncodings: [0x6d, 0x80],
  contentEncoding: [0x62, 0x40],
  contentCompression: [0x50, 0x34],
  compressionAlgorithm: [0x42, 0x54],
  compressionSettings: [0x42, 0x55],
  cluster: [0x1f, 0x43, 0xb6, 0x75],
  clusterTimecode: [0xe7],
  simpleBlock: [0xa3],
  blockGroup: [0xa0],
  block: [0xa1],
  blockDuration: [0x9b],
  voidElement: [0xec],
};

const UNKNOWN_SIZE = Buffer.from([0x01, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]);
const VIDEO_TRACK = 1;
const VIDEO_TRACK_TYPE = 1;
const SUBTITLE_TRACK_TYPE = 0x11;
const ASS_TRACK = 3;
const TEXT_TRACK = 4;
const ASS_HEADER = '[Script Info]\nTitle: Test\n';

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

const unknownSizeElement = (id, ...contents) =>
  Buffer.concat([Buffer.from(id), UNKNOWN_SIZE, ...contents.map((content) => Buffer.from(content))]);

const uintBytes = (value) => {
  const bytes = Buffer.alloc(4);

  bytes.writeUInt32BE(value);

  return bytes;
};

const blockBody = (trackNumber, relativeTimecode, payload) => {
  const header = Buffer.alloc(4);

  header[0] = 0x80 | trackNumber;
  header.writeInt16BE(relativeTimecode, 1);

  return Buffer.concat([header, Buffer.from(payload)]);
};

const subtitleTrackEntry = ({ number, codec, language, name, header, compression }) =>
  element(
    ID.trackEntry,
    element(ID.trackNumber, [number]),
    element(ID.trackType, [SUBTITLE_TRACK_TYPE]),
    element(ID.codecId, codec),
    ...(language ? [element(ID.language, language)] : []),
    ...(name ? [element(ID.name, name)] : []),
    ...(header ? [element(ID.codecPrivate, header)] : []),
    ...(compression
      ? [
          element(
            ID.contentEncodings,
            element(
              ID.contentEncoding,
              element(
                ID.contentCompression,
                element(ID.compressionAlgorithm, [compression.algorithm]),
                ...(compression.settings ? [element(ID.compressionSettings, compression.settings)] : []),
              ),
            ),
          ),
        ]
      : []),
  );

const videoTrackEntry = () =>
  element(
    ID.trackEntry,
    element(ID.trackNumber, [VIDEO_TRACK]),
    element(ID.trackType, [VIDEO_TRACK_TYPE]),
    element(ID.codecId, 'V_MPEG4/ISO/AVC'),
  );

const assTrackEntry = (extra) =>
  subtitleTrackEntry({ number: ASS_TRACK, codec: 'S_TEXT/ASS', language: 'eng', header: ASS_HEADER, ...extra });

const subtitleGroup = (trackNumber, relativeTimecode, durationValue, payload) =>
  element(
    ID.blockGroup,
    element(ID.block, blockBody(trackNumber, relativeTimecode, payload)),
    element(ID.blockDuration, uintBytes(durationValue)),
  );

const videoFrame = (byteCount) => element(ID.simpleBlock, blockBody(VIDEO_TRACK, 0, Buffer.alloc(byteCount)));

const matroskaFile = (...segmentContents) =>
  Buffer.concat([element(ID.ebml, element(ID.voidElement, [0])), element(ID.segment, ...segmentContents)]);

const tracksElement = (...entries) => element(ID.tracks, ...entries);

const clusterAt = (timecode, ...contents) =>
  element(ID.cluster, element(ID.clusterTimecode, uintBytes(timecode)), ...contents);

const ASS_LINE = '12,1,Signs,Speaker,10,20,30,Fade,Hello, world';

describe('readMkvSubtitleTracks', () => {
  let folder = '';

  const readBytes = (bytes, options) => {
    const file = path.join(folder, 'episode.mkv');

    fs.writeFileSync(file, bytes);

    return readMkvSubtitleTracks(file, options);
  };

  beforeEach(() => {
    folder = fs.mkdtempSync(path.join(os.tmpdir(), 'shiori-mkv-'));
  });

  afterEach(() => fs.rmSync(folder, { recursive: true, force: true }));

  it('reads track details, ASS fields, times and durations', async () => {
    const [track] = await readBytes(
      matroskaFile(
        tracksElement(videoTrackEntry(), assTrackEntry({ name: 'Full subs' })),
        clusterAt(1000, videoFrame(50), subtitleGroup(ASS_TRACK, 250, 1500, ASS_LINE)),
      ),
    );

    expect(track).toMatchObject({ number: 3, language: 'eng', name: 'Full subs', type: 'ass', header: ASS_HEADER });

    expect(track.events).toEqual([
      {
        text: 'Hello, world',
        time: 1250,
        duration: 1500,
        layer: '1',
        style: 'Signs',
        name: 'Speaker',
        marginL: '10',
        marginR: '20',
        marginV: '30',
        effect: 'Fade',
      },
    ]);
  });

  it('keeps plain text subtitles whole, including non-English characters', async () => {
    const [track] = await readBytes(
      matroskaFile(
        tracksElement(subtitleTrackEntry({ number: TEXT_TRACK, codec: 'S_TEXT/UTF8', language: 'jpn' })),
        clusterAt(0, subtitleGroup(TEXT_TRACK, 0, 900, '葬送のフリーレン, 第一話')),
      ),
    );

    expect(track.type).toBe('utf8');
    expect(track.events).toEqual([{ text: '葬送のフリーレン, 第一話', time: 0, duration: 900 }]);
  });

  it('applies the file’s timecode scale', async () => {
    const [track] = await readBytes(
      matroskaFile(
        element(ID.info, element(ID.timecodeScale, uintBytes(500000))),
        tracksElement(assTrackEntry()),
        clusterAt(2000, subtitleGroup(ASS_TRACK, 0, 1000, ASS_LINE)),
      ),
    );

    expect(track.events[0]).toMatchObject({ time: 1000, duration: 500 });
  });

  it('allows a block to start just before its cluster', async () => {
    const [track] = await readBytes(
      matroskaFile(tracksElement(assTrackEntry()), clusterAt(1000, subtitleGroup(ASS_TRACK, -200, 100, ASS_LINE))),
    );

    expect(track.events[0].time).toBe(800);
  });

  it('reads a duration stored before its block', async () => {
    const [track] = await readBytes(
      matroskaFile(
        tracksElement(assTrackEntry()),
        clusterAt(
          0,
          element(
            ID.blockGroup,
            element(ID.blockDuration, uintBytes(700)),
            element(ID.block, blockBody(ASS_TRACK, 0, ASS_LINE)),
          ),
        ),
      ),
    );

    expect(track.events[0].duration).toBe(700);
  });

  it('gives a block with no duration a length of zero', async () => {
    const [track] = await readBytes(
      matroskaFile(
        tracksElement(assTrackEntry()),
        clusterAt(0, element(ID.blockGroup, element(ID.block, blockBody(ASS_TRACK, 0, ASS_LINE)))),
      ),
    );

    expect(track.events[0].duration).toBe(0);
  });

  it('leaves out image subtitles such as PGS', async () => {
    const tracks = await readBytes(
      matroskaFile(tracksElement(subtitleTrackEntry({ number: 5, codec: 'S_HDMV/PGS' }), assTrackEntry())),
    );

    expect(tracks.map((track) => track.number)).toEqual([ASS_TRACK]);
  });

  it('stops early when a file has no text subtitles, without reading the rest', async () => {
    const tracks = await readBytes(matroskaFile(tracksElement(videoTrackEntry()), Buffer.from([0xff, 0xff, 0xff])));

    expect(tracks).toEqual([]);
  });

  it('inflates zlib-compressed subtitles', async () => {
    const [track] = await readBytes(
      matroskaFile(
        tracksElement(assTrackEntry({ compression: { algorithm: 0 } })),
        clusterAt(0, subtitleGroup(ASS_TRACK, 0, 100, zlib.deflateSync(ASS_LINE))),
      ),
    );

    expect(track.events[0].text).toBe('Hello, world');
  });

  it('restores header-stripped subtitles', async () => {
    const [track] = await readBytes(
      matroskaFile(
        tracksElement(assTrackEntry({ compression: { algorithm: 3, settings: ASS_LINE.slice(0, 5) } })),
        clusterAt(0, subtitleGroup(ASS_TRACK, 0, 100, ASS_LINE.slice(5))),
      ),
    );

    expect(track.events[0].text).toBe('Hello, world');
  });

  it('skips one damaged line and keeps the others', async () => {
    const [track] = await readBytes(
      matroskaFile(
        tracksElement(assTrackEntry({ compression: { algorithm: 0 } })),
        clusterAt(
          0,
          subtitleGroup(ASS_TRACK, 0, 100, 'not zlib data'),
          subtitleGroup(ASS_TRACK, 10, 100, zlib.deflateSync(ASS_LINE)),
        ),
      ),
    );

    expect(track.events.map((event) => event.time)).toEqual([10]);
  });

  it('reads files whose segment and clusters have unknown sizes', async () => {
    const [track] = await readBytes(
      Buffer.concat([
        element(ID.ebml),

        unknownSizeElement(
          ID.segment,
          tracksElement(assTrackEntry()),
          unknownSizeElement(
            ID.cluster,
            element(ID.clusterTimecode, uintBytes(100)),
            subtitleGroup(ASS_TRACK, 0, 50, ASS_LINE),
          ),
          unknownSizeElement(
            ID.cluster,
            element(ID.clusterTimecode, uintBytes(200)),
            subtitleGroup(ASS_TRACK, 0, 50, ASS_LINE),
          ),
        ),
      ]),
    );

    expect(track.events.map((event) => event.time)).toEqual([100, 200]);
  });

  it('keeps subtitles it already read when the file repeats its track list', async () => {
    const [track] = await readBytes(
      matroskaFile(
        tracksElement(assTrackEntry()),
        clusterAt(0, subtitleGroup(ASS_TRACK, 0, 100, ASS_LINE)),
        tracksElement(assTrackEntry()),
        clusterAt(500, subtitleGroup(ASS_TRACK, 0, 100, ASS_LINE)),
      ),
    );

    expect(track.events.map((event) => event.time)).toEqual([0, 500]);
  });

  it('returns what it read so far from a file cut off mid-download', async () => {
    const complete = matroskaFile(
      tracksElement(assTrackEntry()),
      clusterAt(0, subtitleGroup(ASS_TRACK, 0, 100, ASS_LINE), videoFrame(5000)),
    );

    const [track] = await readBytes(complete.subarray(0, complete.length - 2000));

    expect(track.events).toHaveLength(1);
  });

  it('stops without hanging on garbage', async () => {
    await expect(readBytes(Buffer.alloc(4096))).resolves.toEqual([]);
    await expect(readBytes(Buffer.from([0x1a, 0x45]))).resolves.toEqual([]);
    await expect(readBytes(Buffer.alloc(0))).resolves.toEqual([]);
  });

  it('gives the same result whatever the read window size', async () => {
    const bytes = matroskaFile(
      tracksElement(videoTrackEntry(), assTrackEntry({ name: 'Full subs' })),
      clusterAt(0, videoFrame(70), subtitleGroup(ASS_TRACK, 5, 100, ASS_LINE), videoFrame(300)),
      clusterAt(1000, subtitleGroup(ASS_TRACK, 5, 100, ASS_LINE.repeat(4)), videoFrame(9000)),
      clusterAt(2000, subtitleGroup(ASS_TRACK, 5, 100, ASS_LINE)),
    );

    const whole = await readBytes(bytes);

    expect(whole[0].events).toHaveLength(3);
    await expect(readBytes(bytes, { windowBytes: 16 })).resolves.toEqual(whole);
    await expect(readBytes(bytes, { windowBytes: 64 })).resolves.toEqual(whole);
    await expect(readBytes(bytes, { windowBytes: 1024 })).resolves.toEqual(whole);
  });
});
