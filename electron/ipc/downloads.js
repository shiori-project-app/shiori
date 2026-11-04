import fs from 'node:fs';
import path from 'node:path';
import { app, ipcMain, shell } from 'electron';
import { isActive, isPending, isRetryable } from '../../shared/downloadStates.js';
import { safeName } from '../../shared/fileNames.js';
import {
  applyParallelLimit,
  startQueuedDownloads,
  stopAllDownloads,
  stopDownload,
  waitForTransferToStop,
} from '../downloads/downloadRunner.js';
import {
  allJobs,
  findJob,
  loadJobs,
  replaceJobs,
  requeueInterruptedJobs,
  saveJobsNow,
  updateJob,
} from '../downloads/queueStore.js';
import { logError, logInfo } from '../logger.js';
import { renameUnsafeShowFolders, savePathAfterMoves } from '../showFolderMigration.js';
import { downloadsRoot, showFolder } from './paths.js';
import { onSettingsChanged } from './settings.js';

const DOWNLOAD_HOST = /(^|\.)animeheaven\.me$/;

const assertDownloadableUrl = (url) => {
  const target = new URL(url);

  if (target.protocol !== 'https:' || !DOWNLOAD_HOST.test(target.hostname)) {
    throw new Error(`Shiori can't download from ${target.hostname}`);
  }

  return target.toString();
};

const toQueuedJob = (item, savePath, url) => ({
  id: item.id,
  seriesId: item.seriesId,
  episode: item.episode,
  episodeKey: item.episodeKey,
  label: item.label,
  url,
  savePath,
  state: 'queued',
  received: 0,
  total: 0,
  addedAt: Date.now(),
});

const validatedItemOrNull = (item) => {
  try {
    return {
      item,
      url: assertDownloadableUrl(item.url),
      savePath: path.join(showFolder(item.folder), safeName(item.fileName)),
    };
  } catch (error) {
    logError(`Download rejected: ${item.label}`, error);

    return null;
  }
};

const addDownloads = (_event, items) => {
  const validatedItems = items.map(validatedItemOrNull);
  const rejectedEpisodes = items.filter((_, index) => !validatedItems[index]).map((item) => item.episode);

  const busySavePaths = new Set(
    allJobs()
      .filter(isPending)
      .map((job) => job.savePath),
  );

  const newJobs = validatedItems
    .filter(Boolean)
    .filter(({ savePath }) => {
      if (busySavePaths.has(savePath)) return false;

      busySavePaths.add(savePath);

      return true;
    })
    .map(({ item, savePath, url }) => toQueuedJob(item, savePath, url));

  replaceJobs([...allJobs(), ...newJobs]);
  startQueuedDownloads();

  return { added: newJobs.length, rejectedEpisodes };
};

const pauseJob = (job) => {
  stopDownload(job.id);
  updateJob(job.id, { state: 'paused', speed: 0 });
};

const pauseDownload = (_event, jobId) => {
  const job = findJob(jobId);

  if (!job || !isActive(job)) return;

  pauseJob(job);
  startQueuedDownloads();
};

const resumeDownload = (_event, jobId) => {
  if (findJob(jobId)?.state === 'paused') updateJob(jobId, { state: 'queued' });

  startQueuedDownloads();
};

const pauseAllDownloads = () => allJobs().filter(isActive).forEach(pauseJob);

const resumeAllDownloads = () => {
  allJobs()
    .filter((job) => job.state === 'paused')
    .forEach((job) => updateJob(job.id, { state: 'queued' }));

  startQueuedDownloads();
};

const removePartialFile = (job) => {
  try {
    fs.rmSync(`${job.savePath}.part`, { force: true });
  } catch (error) {
    logError(`Partial file of ${job.label} couldn't be removed`, error);
  }
};

const cancelDownload = async (_event, jobId) => {
  const job = findJob(jobId);

  if (!job) return;

  stopDownload(jobId);
  updateJob(jobId, { state: 'cancelled', received: 0, total: 0, speed: 0, resumeValidator: null });
  await waitForTransferToStop(jobId);
  removePartialFile(job);
  startQueuedDownloads();
};

const retryDownload = (_event, jobId, freshUrl) => {
  const job = findJob(jobId);

  if (!job || !isRetryable(job)) return;

  updateJob(jobId, { state: 'queued', error: null, ...(freshUrl ? { url: assertDownloadableUrl(freshUrl) } : {}) });
  startQueuedDownloads();
};

const moveDownload = (_event, jobId, positionChange) => {
  const jobs = allJobs();
  const currentIndex = jobs.findIndex((job) => job.id === jobId);
  const targetIndex = currentIndex + positionChange;

  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= jobs.length) return;

  const reorderedJobs = [...jobs];

  [reorderedJobs[currentIndex], reorderedJobs[targetIndex]] = [reorderedJobs[targetIndex], reorderedJobs[currentIndex]];
  replaceJobs(reorderedJobs);
};

const removeDownload = (_event, jobId) => {
  const job = findJob(jobId);

  if (!job || isPending(job)) return;

  removePartialFile(job);
  replaceJobs(allJobs().filter((otherJob) => otherJob.id !== jobId));
};

const clearFinishedDownloads = () => {
  allJobs()
    .filter((job) => !isPending(job))
    .forEach(removePartialFile);

  replaceJobs(allJobs().filter(isPending));
};

const showDownload = (_event, savePath) => {
  if (!allJobs().some((job) => job.savePath === savePath)) throw new Error('Not a Shiori download');

  if (fs.existsSync(savePath)) shell.showItemInFolder(savePath);
  else shell.openPath(path.dirname(savePath));
};

const saveQueueBeforeQuit = () => {
  stopAllDownloads();
  requeueInterruptedJobs();
  saveJobsNow();
};

const DOWNLOAD_HANDLERS = {
  'downloads:list': () => allJobs(),
  'downloads:add': addDownloads,
  'downloads:pause': pauseDownload,
  'downloads:resume': resumeDownload,
  'downloads:pause-all': pauseAllDownloads,
  'downloads:resume-all': resumeAllDownloads,
  'downloads:cancel': cancelDownload,
  'downloads:retry': retryDownload,
  'downloads:move': moveDownload,
  'downloads:remove': removeDownload,
  'downloads:clear-finished': clearFinishedDownloads,
  'downloads:show': showDownload,
};

const moveJobsOutOfUnsafeFolders = () => {
  if (process.platform !== 'win32') return;

  const moves = renameUnsafeShowFolders(downloadsRoot(), (folder, error) =>
    logError(`Could not rename ${folder}`, error),
  );

  if (!moves.length) return;

  logInfo(`Renamed ${moves.length} show folders Windows could not open`);
  replaceJobs(allJobs().map((job) => ({ ...job, savePath: savePathAfterMoves(job.savePath, moves) })));
};

export const registerDownloadHandlers = () => {
  loadJobs();
  moveJobsOutOfUnsafeFolders();
  app.whenReady().then(startQueuedDownloads);
  onSettingsChanged(applyParallelLimit);
  app.on('before-quit', saveQueueBeforeQuit);
  Object.entries(DOWNLOAD_HANDLERS).forEach(([channel, handler]) => ipcMain.handle(channel, handler));
};
