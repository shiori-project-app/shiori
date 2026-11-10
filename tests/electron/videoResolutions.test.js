import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const readVideoResolution = vi.hoisted(() => vi.fn());
const logError = vi.hoisted(() => vi.fn());

vi.mock('../../electron/logger.js', () => ({ logError }));
vi.mock('../../electron/videoResolutionReader.js', () => ({ readVideoResolution }));

const { videoResolutionsOf } = await import('../../electron/videoResolutions.js');

const HD = { width: 1280, height: 720 };
const RETRY_DELAY_MS = 60000;

describe('videoResolutionsOf', () => {
  let testFolder;

  const inTestFolder = (name) => path.join(testFolder, name);

  const writeVideo = (name, content = 'video') => {
    fs.writeFileSync(inTestFolder(name), content);

    return inTestFolder(name);
  };

  beforeEach(() => {
    testFolder = fs.mkdtempSync(path.join(os.tmpdir(), 'shiori-resolutions-'));
    logError.mockReset();
    readVideoResolution.mockReset();
    readVideoResolution.mockResolvedValue(HD);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(testFolder, { recursive: true, force: true });
  });

  it('answers by the key it was given, using the path function', async () => {
    writeVideo('one.mkv');

    expect(await videoResolutionsOf(['one.mkv'], inTestFolder)).toEqual({ 'one.mkv': HD });
  });

  it('answers null for a path the path function refuses', async () => {
    const refuseEverything = () => {
      throw new Error('Outside the download folder');
    };

    expect(await videoResolutionsOf(['../outside.mkv'], refuseEverything)).toEqual({ '../outside.mkv': null });
  });

  it('answers null for a missing file without logging', async () => {
    const missingFile = inTestFolder('missing.mkv');

    expect(await videoResolutionsOf([missingFile])).toEqual({ [missingFile]: null });
    expect(logError).not.toHaveBeenCalled();
  });

  it('keeps going when one file fails to read, and logs that failure once', async () => {
    const goodFile = writeVideo('good.mkv');
    const lockedFile = writeVideo('locked.mkv');

    readVideoResolution.mockImplementation(async (videoPath) => {
      if (videoPath === lockedFile) throw new Error('EBUSY');

      return HD;
    });

    expect(await videoResolutionsOf([goodFile, lockedFile])).toEqual({ [goodFile]: HD, [lockedFile]: null });
    await videoResolutionsOf([lockedFile]);
    expect(logError).toHaveBeenCalledTimes(1);
  });

  it('tries a failed file again after a minute, without logging it again', async () => {
    const lockedFile = writeVideo('briefly-locked.mkv');
    const now = vi.spyOn(Date, 'now').mockReturnValue(1000);

    readVideoResolution.mockRejectedValueOnce(new Error('EBUSY')).mockRejectedValueOnce(new Error('EBUSY'));

    expect(await videoResolutionsOf([lockedFile])).toEqual({ [lockedFile]: null });

    now.mockReturnValue(1000 + RETRY_DELAY_MS - 1);
    expect(await videoResolutionsOf([lockedFile])).toEqual({ [lockedFile]: null });
    expect(readVideoResolution).toHaveBeenCalledTimes(1);

    now.mockReturnValue(1000 + RETRY_DELAY_MS);
    expect(await videoResolutionsOf([lockedFile])).toEqual({ [lockedFile]: null });
    expect(readVideoResolution).toHaveBeenCalledTimes(2);
    expect(logError).toHaveBeenCalledTimes(1);

    now.mockReturnValue(1000 + 2 * RETRY_DELAY_MS);
    expect(await videoResolutionsOf([lockedFile])).toEqual({ [lockedFile]: HD });
  });

  it('reads an unchanged file once, including files with no resolution', async () => {
    const videoFile = writeVideo('once.mkv');

    readVideoResolution.mockResolvedValue(null);

    await videoResolutionsOf([videoFile]);
    await videoResolutionsOf([videoFile]);

    expect(readVideoResolution).toHaveBeenCalledTimes(1);
  });

  it('shares one read between overlapping requests for a file', async () => {
    const videoFile = writeVideo('shared.mkv');

    const answers = await Promise.all([videoResolutionsOf([videoFile, videoFile]), videoResolutionsOf([videoFile])]);

    expect(answers).toEqual([{ [videoFile]: HD }, { [videoFile]: HD }]);
    expect(readVideoResolution).toHaveBeenCalledTimes(1);
  });

  it('reads a file again after it changes', async () => {
    const videoFile = writeVideo('replaced.mkv', 'short');

    await videoResolutionsOf([videoFile]);
    writeVideo('replaced.mkv', 'a much longer replacement file');
    await videoResolutionsOf([videoFile]);

    expect(readVideoResolution).toHaveBeenCalledTimes(2);
  });

  it('checks at most two files at a time, so a slow drive can’t tie up the main process', async () => {
    const videoFiles = ['a', 'b', 'c', 'd', 'e', 'f'].map((name) => writeVideo(`${name}.mkv`));
    const finishReads = [];
    let readsInProgress = 0;
    let mostReadsAtOnce = 0;

    readVideoResolution.mockImplementation(
      () =>
        new Promise((resolve) => {
          readsInProgress += 1;
          mostReadsAtOnce = Math.max(mostReadsAtOnce, readsInProgress);

          finishReads.push(() => {
            readsInProgress -= 1;
            resolve(HD);
          });
        }),
    );

    const answers = Promise.all([videoResolutionsOf(videoFiles.slice(0, 4)), videoResolutionsOf(videoFiles.slice(4))]);

    await vi.waitFor(() => {
      finishReads.splice(0).forEach((finishRead) => finishRead());

      if (readVideoResolution.mock.calls.length < videoFiles.length) throw new Error('reads still waiting');
    });

    finishReads.splice(0).forEach((finishRead) => finishRead());

    expect(Object.keys(Object.assign({}, ...(await answers)))).toHaveLength(videoFiles.length);
    expect(mostReadsAtOnce).toBe(2);
  });
});
