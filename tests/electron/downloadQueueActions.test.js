import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const testFolder = vi.hoisted(() => ({ path: '' }));
const fetchMock = vi.hoisted(() => vi.fn());
const handlers = vi.hoisted(() => new Map());

vi.mock('electron', () => ({
  app: { getPath: () => testFolder.path, on: () => {}, whenReady: () => new Promise(() => {}) },
  BrowserWindow: { getAllWindows: () => [] },
  ipcMain: { handle: (channel, handler) => handlers.set(channel, handler) },
  net: { fetch: fetchMock },
  shell: {},
}));

vi.mock('../../electron/ipc/settings.js', () => ({
  getSettings: () => ({ maxParallelDownloads: 2, speedLimitKBps: 0, downloadDir: testFolder.path }),
  onSettingsChanged: () => {},
}));

const { registerDownloadHandlers } = await import('../../electron/ipc/downloads.js');
const { stopAllDownloads, waitForTransferToStop } = await import('../../electron/downloads/downloadRunner.js');
const { allJobs, findJob, replaceJobs } = await import('../../electron/downloads/queueStore.js');

registerDownloadHandlers();

const invoke = (channel, ...args) => handlers.get(channel)({}, ...args);

const jobIn = (state, fileName, extra = {}) => ({
  id: fileName,
  label: fileName,
  url: 'https://cdn.animeheaven.me/video.mp4',
  savePath: path.join(testFolder.path, fileName),
  state,
  received: 0,
  total: 0,
  ...extra,
});

const writePartialFile = (job) => fs.writeFileSync(`${job.savePath}.part`, 'partial');

const partialFileExists = (job) => fs.existsSync(`${job.savePath}.part`);

const bodyUntilAborted = (signal) =>
  new ReadableStream({
    start: (controller) => {
      controller.enqueue(new TextEncoder().encode('AAAA'));
      signal.addEventListener('abort', () => controller.error(new Error('aborted')));
    },
  });

const startRunningJob = async (fileName) => {
  fetchMock.mockImplementation(
    async (_url, { signal }) => new Response(bodyUntilAborted(signal), { headers: { 'content-length': '8' } }),
  );

  const job = jobIn('queued', fileName);

  replaceJobs([job]);
  invoke('downloads:resume-all');

  await vi.waitFor(() => {
    if (findJob(job.id)?.received !== 4) throw new Error('not running yet');
  });

  return job;
};

describe('download queue actions', () => {
  beforeEach(() => {
    testFolder.path = fs.mkdtempSync(path.join(os.tmpdir(), 'shiori-queue-'));
    fetchMock.mockReset();
  });

  afterEach(async () => {
    stopAllDownloads();
    await Promise.all(allJobs().map((job) => waitForTransferToStop(job.id)));
    replaceJobs([]);
    fs.rmSync(testFolder.path, { recursive: true, force: true });
  });

  it('cancels a running download, removes its file, and does not restart it', async () => {
    const job = await startRunningJob('cancel-running.mp4');

    await invoke('downloads:cancel', job.id);

    expect(findJob(job.id)).toMatchObject({ state: 'cancelled', received: 0, total: 0 });
    expect(partialFileExists(job)).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('keeps a cancel that arrives while a resumed job is still waiting for the old transfer', async () => {
    const job = await startRunningJob('pause-resume-cancel.mp4');

    invoke('downloads:pause', job.id);
    invoke('downloads:resume', job.id);
    await invoke('downloads:cancel', job.id);
    await waitForTransferToStop(job.id);

    expect(findJob(job.id).state).toBe('cancelled');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(partialFileExists(job)).toBe(false);
  });

  it('queues the good links and reports the bad ones, instead of rejecting the whole batch', () => {
    fetchMock.mockImplementation(
      (_url, { signal }) =>
        new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('aborted')))),
    );

    const item = (episode, url) => ({
      id: `batch-${episode}`,
      seriesId: 1,
      episode,
      episodeKey: `1-${episode}`,
      label: `Episode ${episode}`,
      url,
      folder: 'Show',
      fileName: `Show - ${episode}.mp4`,
    });

    const result = invoke('downloads:add', [
      item(1, 'https://cdn.animeheaven.me/1.mp4'),
      item(2, 'https://elsewhere.example/2.mp4'),
      item(3, '/relative/3.mp4'),
    ]);

    expect(result).toEqual({ added: 1, rejectedEpisodes: [2, 3] });
    expect(allJobs().map((job) => job.episode)).toEqual([1]);
  });

  it('forgets the partial file when a failed download is removed from the list', async () => {
    const job = jobIn('failed', 'remove-failed.mp4', { total: 100 });

    writePartialFile(job);
    replaceJobs([job]);

    invoke('downloads:remove', job.id);

    expect(findJob(job.id)).toBeUndefined();
    expect(partialFileExists(job)).toBe(false);
  });

  it('clears partial files of finished jobs but keeps those of paused ones', () => {
    const failed = jobIn('failed', 'clear-failed.mp4', { total: 100 });
    const paused = jobIn('paused', 'clear-paused.mp4', { total: 100 });

    [failed, paused].forEach(writePartialFile);
    replaceJobs([failed, paused]);

    invoke('downloads:clear-finished');

    expect(partialFileExists(failed)).toBe(false);
    expect(partialFileExists(paused)).toBe(true);
    expect(findJob(paused.id).state).toBe('paused');
  });
});
