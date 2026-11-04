import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const testFolder = vi.hoisted(() => ({ path: '' }));
const fetchMock = vi.hoisted(() => vi.fn());

vi.mock('electron', () => ({
  app: { getPath: () => testFolder.path },
  BrowserWindow: { getAllWindows: () => [] },
  net: { fetch: fetchMock },
}));

vi.mock('../../electron/ipc/settings.js', () => ({
  getSettings: () => ({ maxParallelDownloads: 2, speedLimitKBps: 0 }),
  onSettingsChanged: () => {},
}));

const { STALL_TIMEOUT_MS, startQueuedDownloads, stopAllDownloads, stopDownload, waitForTransferToStop } =
  await import('../../electron/downloads/downloadRunner.js');

const { findJob, replaceJobs, updateJob } = await import('../../electron/downloads/queueStore.js');

const queuedJob = (fileName) => ({
  id: fileName,
  label: fileName,
  url: 'https://cdn.animeheaven.me/video.mp4?download=1',
  savePath: path.join(testFolder.path, 'Show', fileName),
  state: 'queued',
  received: 0,
  total: 0,
});

const responseWith = (body, { status = 200, contentLength, contentRange, headers = {} } = {}) =>
  new Response(body, {
    status,

    headers: {
      ...headers,
      ...(contentLength == null ? {} : { 'content-length': String(contentLength) }),
      ...(contentRange ? { 'content-range': contentRange } : {}),
    },
  });

const jobWithPartialFile = (fileName, partialContent, total) => {
  const job = { ...queuedJob(fileName), total };

  fs.mkdirSync(path.dirname(job.savePath), { recursive: true });
  fs.writeFileSync(`${job.savePath}.part`, partialContent);

  return job;
};

const waitForState = (jobId, expectedStates) =>
  vi.waitFor(
    () => {
      const state = findJob(jobId)?.state;

      if (!expectedStates.includes(state)) throw new Error(`still ${state}`);

      return state;
    },
    { timeout: 5000 },
  );

describe('download runner', () => {
  beforeEach(() => {
    testFolder.path = fs.mkdtempSync(path.join(os.tmpdir(), 'shiori-runner-'));
    fetchMock.mockReset();
  });

  afterEach(() => {
    stopAllDownloads();
    vi.useRealTimers();
    fs.rmSync(testFolder.path, { recursive: true, force: true });
  });

  const bodyThatSendsThenWaitsUntilAborted = (text, signal) =>
    new ReadableStream({
      start: (controller) => {
        controller.enqueue(new TextEncoder().encode(text));
        signal.addEventListener('abort', () => controller.error(new Error('aborted')));
      },
    });

  const startSlowFirstTransfer = async (fileName) => {
    fetchMock.mockImplementationOnce(async (_url, { signal }) =>
      responseWith(bodyThatSendsThenWaitsUntilAborted('AAAA', signal), { contentLength: 8 }),
    );

    const job = queuedJob(fileName);

    replaceJobs([job]);
    startQueuedDownloads();

    await vi.waitFor(() => {
      const partPath = `${job.savePath}.part`;
      const isOnDisk = fs.existsSync(partPath) && fs.statSync(partPath).size === 4;

      if (findJob(job.id)?.received !== 4 || !isOnDisk) throw new Error('first bytes not on disk yet');
    });

    return job;
  };

  it('waits for a stopped transfer to close the partial file before resuming', async () => {
    const job = await startSlowFirstTransfer('resume-after-stop.mp4');

    fetchMock.mockImplementationOnce(async () =>
      responseWith('BBBB', { status: 206, contentLength: 4, contentRange: 'bytes 4-7/8' }),
    );

    stopDownload(job.id);
    updateJob(job.id, { state: 'queued' });
    startQueuedDownloads();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await waitForState(job.id, ['completed']);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.lastCall[1].headers).toEqual({ Range: 'bytes=4-' });
    expect(fs.readFileSync(job.savePath, 'utf8')).toBe('AAAABBBB');
  });

  it('never starts a resumed transfer that was stopped again while waiting', async () => {
    const job = await startSlowFirstTransfer('stop-twice.mp4');

    stopDownload(job.id);
    updateJob(job.id, { state: 'queued' });
    startQueuedDownloads();
    stopDownload(job.id);
    updateJob(job.id, { state: 'paused' });

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(findJob(job.id).state).toBe('paused');
  });

  it('fails instead of completing when the file on disk is the wrong size', async () => {
    const job = jobWithPartialFile('wrong-size.mp4', 'AAAA', 8);

    fetchMock.mockResolvedValue(responseWith('BBBB', { status: 206, contentLength: 4, contentRange: 'bytes 4-7/8' }));

    const realCreateWriteStream = fs.createWriteStream;

    const writeSpy = vi.spyOn(fs, 'createWriteStream').mockImplementation((filePath, options) => {
      fs.appendFileSync(filePath, 'written by something else');

      return realCreateWriteStream(filePath, options);
    });

    replaceJobs([job]);
    startQueuedDownloads();

    await waitForState(job.id, ['failed']);
    writeSpy.mockRestore();
    expect(findJob(job.id).error).toMatch(/wrong size/);
    expect(fs.existsSync(job.savePath)).toBe(false);
    expect(fs.existsSync(`${job.savePath}.part`)).toBe(false);
  });

  const failedMismatchCases = [
    ['starts at the wrong byte', 'bytes 0-6/7'],
    ['belongs to a file of another size', 'bytes 6-9/99'],
    ['has no Content-Range at all', undefined],
  ];

  it.each(failedMismatchCases)('never splices a resumed response that %s', async (_description, contentRange) => {
    const job = jobWithPartialFile('spliced.mp4', 'OLDOLD', 10);

    fetchMock.mockResolvedValue(responseWith('NEWB', { status: 206, contentLength: 4, contentRange }));
    replaceJobs([job]);
    startQueuedDownloads();

    await waitForState(job.id, ['failed']);
    expect(findJob(job.id).error).toMatch(/no longer matches/);
    expect(fs.existsSync(job.savePath)).toBe(false);
    expect(fs.existsSync(`${job.savePath}.part`)).toBe(false);
  });

  it('accepts a resumed response that does not state the whole file size', async () => {
    const job = jobWithPartialFile('unknown-size.mp4', 'OLDOLD', 10);

    fetchMock.mockResolvedValue(responseWith('NEWB', { status: 206, contentLength: 4, contentRange: 'bytes 6-9/*' }));
    replaceJobs([job]);
    startQueuedDownloads();

    await waitForState(job.id, ['completed']);
    expect(fs.readFileSync(job.savePath, 'utf8')).toBe('OLDOLDNEWB');
  });

  it('starts over instead of trusting a partial file this job never recorded', async () => {
    const job = jobWithPartialFile('orphan.mp4', 'leftover from a removed download', 0);

    fetchMock.mockResolvedValue(responseWith('episode', { contentLength: 7 }));
    replaceJobs([job]);
    startQueuedDownloads();

    await waitForState(job.id, ['completed']);
    expect(fetchMock.mock.lastCall[1].headers).toEqual({});
    expect(fs.readFileSync(job.savePath, 'utf8')).toBe('episode');
  });

  it('asks the server to resume only if the file has not changed', async () => {
    fetchMock.mockResolvedValueOnce(
      responseWith('AAAA', { contentLength: 8, headers: { etag: '"version-1"', 'last-modified': 'yesterday' } }),
    );

    const job = queuedJob('validated.mp4');

    replaceJobs([job]);
    startQueuedDownloads();
    await waitForState(job.id, ['failed']);
    expect(findJob(job.id).resumeValidator).toBe('"version-1"');

    fetchMock.mockResolvedValueOnce(responseWith('new file', { contentLength: 8 }));
    updateJob(job.id, { state: 'queued' });
    startQueuedDownloads();
    await waitForState(job.id, ['completed']);

    expect(fetchMock.mock.lastCall[1].headers).toEqual({ Range: 'bytes=4-', 'If-Range': '"version-1"' });
    expect(fs.readFileSync(job.savePath, 'utf8')).toBe('new file');
  });

  it('does not use a weak entity tag to resume, falling back to the modified date', async () => {
    fetchMock.mockResolvedValueOnce(
      responseWith('AAAA', { contentLength: 8, headers: { etag: 'W/"weak"', 'last-modified': 'yesterday' } }),
    );

    const job = queuedJob('weak-tag.mp4');

    replaceJobs([job]);
    startQueuedDownloads();
    await waitForState(job.id, ['failed']);
    expect(findJob(job.id).resumeValidator).toBe('yesterday');
  });

  it.each([
    ['no body', () => new Response(null, { status: 204 })],
    ['an empty body', () => responseWith('', { contentLength: 0 })],
  ])('fails cleanly instead of hanging when the server sends %s', async (_description, respond) => {
    fetchMock.mockImplementation(async () => respond());

    const job = queuedJob('no-body.mp4');

    replaceJobs([job]);
    startQueuedDownloads();

    await waitForState(job.id, ['failed']);
    expect(findJob(job.id).error).toMatch(/no data/);
    await expect(waitForTransferToStop(job.id)).resolves.toBeUndefined();
    expect(fs.existsSync(`${job.savePath}.part`)).toBe(false);
  });

  it('refuses a web page sent instead of the video, keeping the partial file', async () => {
    const job = jobWithPartialFile('error-page.mp4', 'AAAA', 8);

    fetchMock.mockResolvedValue(
      responseWith('<html>Expired link</html>', {
        contentLength: 25,
        headers: { 'content-type': 'text/html; charset=utf-8' },
      }),
    );

    replaceJobs([job]);
    startQueuedDownloads();

    await waitForState(job.id, ['failed']);
    expect(findJob(job.id).error).toMatch(/web page/);
    expect(fs.existsSync(job.savePath)).toBe(false);
    expect(fs.readFileSync(`${job.savePath}.part`, 'utf8')).toBe('AAAA');
  });

  it('saves a complete download under its final name', async () => {
    fetchMock.mockResolvedValue(responseWith('episode bytes', { contentLength: 13 }));

    const job = queuedJob('complete.mp4');

    replaceJobs([job]);
    startQueuedDownloads();

    await waitForState(job.id, ['completed']);
    expect(fs.readFileSync(job.savePath, 'utf8')).toBe('episode bytes');
    expect(fs.existsSync(`${job.savePath}.part`)).toBe(false);
  });

  it('fails a download that ended early and keeps the partial file to resume', async () => {
    fetchMock.mockResolvedValue(responseWith('short', { contentLength: 13 }));

    const job = queuedJob('short.mp4');

    replaceJobs([job]);
    startQueuedDownloads();

    await waitForState(job.id, ['failed']);
    expect(findJob(job.id).error).toMatch(/ended early \(5 of 13 bytes\)/);
    expect(fs.existsSync(job.savePath)).toBe(false);
    expect(fs.readFileSync(`${job.savePath}.part`, 'utf8')).toBe('short');
  });

  it('resumes from the partial file with a range request', async () => {
    const job = { ...queuedJob('resume.mp4'), total: 13 };

    fs.mkdirSync(path.dirname(job.savePath), { recursive: true });
    fs.writeFileSync(`${job.savePath}.part`, 'episode ');

    fetchMock.mockResolvedValue(
      responseWith('bytes', { status: 206, contentLength: 5, contentRange: 'bytes 8-12/13' }),
    );

    replaceJobs([job]);
    startQueuedDownloads();

    await waitForState(job.id, ['completed']);
    expect(fetchMock.mock.calls[0][1].headers).toEqual({ Range: 'bytes=8-' });
    expect(fs.readFileSync(job.savePath, 'utf8')).toBe('episode bytes');
  });

  it('finishes when the partial file already holds the whole episode', async () => {
    const job = { ...queuedJob('whole.mp4'), total: 13 };

    fs.mkdirSync(path.dirname(job.savePath), { recursive: true });
    fs.writeFileSync(`${job.savePath}.part`, 'episode bytes');
    fetchMock.mockResolvedValue(new Response(null, { status: 416, headers: { 'content-range': 'bytes */13' } }));
    replaceJobs([job]);
    startQueuedDownloads();

    await waitForState(job.id, ['completed']);
    expect(fs.readFileSync(job.savePath, 'utf8')).toBe('episode bytes');
    expect(findJob(job.id).received).toBe(13);
  });

  it('drops a partial file the server can no longer resume so that Retry starts over', async () => {
    const job = { ...queuedJob('mismatch.mp4'), total: 13 };

    fs.mkdirSync(path.dirname(job.savePath), { recursive: true });
    fs.writeFileSync(`${job.savePath}.part`, 'too many bytes for this episode');
    fetchMock.mockResolvedValue(new Response(null, { status: 416, headers: { 'content-range': 'bytes */13' } }));
    replaceJobs([job]);
    startQueuedDownloads();

    await waitForState(job.id, ['failed']);
    expect(findJob(job.id).error).toMatch(/Retry to download it again/);
    expect(fs.existsSync(`${job.savePath}.part`)).toBe(false);
  });

  it('records the real size of a download sent without a content length', async () => {
    fetchMock.mockResolvedValue(responseWith('episode bytes'));

    const job = queuedJob('unknown-length.mp4');

    replaceJobs([job]);
    startQueuedDownloads();

    await waitForState(job.id, ['completed']);
    expect(findJob(job.id).received).toBe(13);
    expect(findJob(job.id).total).toBe(13);
  });

  it('fails a download whose connection stops sending data', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

    fetchMock.mockImplementation((_url, { signal }) =>
      Promise.resolve(
        responseWith(
          new ReadableStream({
            start: (streamController) => signal.addEventListener('abort', () => streamController.error(signal.reason)),
          }),
          { contentLength: 10 },
        ),
      ),
    );

    const job = queuedJob('stalled.mp4');

    replaceJobs([job]);
    startQueuedDownloads();

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await vi.advanceTimersByTimeAsync(STALL_TIMEOUT_MS);
    vi.useRealTimers();
    await waitForState(job.id, ['failed']);
    expect(findJob(job.id).error).toMatch(/connection stalled/);
  });

  it('marks a download as skipped when the file already exists', async () => {
    const job = queuedJob('existing.mp4');

    fs.mkdirSync(path.dirname(job.savePath), { recursive: true });
    fs.writeFileSync(job.savePath, 'already here');
    replaceJobs([job]);
    startQueuedDownloads();

    await waitForState(job.id, ['completed']);
    expect(findJob(job.id).skipped).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
