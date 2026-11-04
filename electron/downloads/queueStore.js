import fs from 'node:fs';
import path from 'node:path';
import { app, BrowserWindow } from 'electron';
import { writeFileAtomically } from '../fileSystem.js';
import { logError } from '../logger.js';

const SAVE_DELAY_MS = 2000;
const BROADCAST_DELAY_MS = 200;

const queueFile = () => path.join(app.getPath('userData'), 'downloads.json');

let jobs = [];
let pendingSave = null;
let pendingBroadcast = null;

const requeueInterrupted = (job) => (job.state === 'downloading' ? { ...job, state: 'queued' } : job);

const setAsideUnreadableQueue = (error) => {
  logError('Download queue file could not be read; starting with an empty queue', error);

  if (fs.existsSync(queueFile())) fs.renameSync(queueFile(), `${queueFile()}.unreadable`);
};

export const loadJobs = () => {
  if (!fs.existsSync(queueFile())) {
    jobs = [];

    return;
  }

  try {
    jobs = JSON.parse(fs.readFileSync(queueFile(), 'utf8')).map(requeueInterrupted);
  } catch (error) {
    setAsideUnreadableQueue(error);
    jobs = [];
  }
};

export const saveJobsNow = () => writeFileAtomically(queueFile(), JSON.stringify(jobs));

const broadcastJobs = () =>
  BrowserWindow.getAllWindows().forEach((window) => window.webContents.send('downloads:changed', jobs));

const notifyJobsChanged = () => {
  pendingSave ??= setTimeout(() => {
    pendingSave = null;
    saveJobsNow();
  }, SAVE_DELAY_MS);

  pendingBroadcast ??= setTimeout(() => {
    pendingBroadcast = null;
    broadcastJobs();
  }, BROADCAST_DELAY_MS);
};

export const allJobs = () => jobs;

export const findJob = (jobId) => jobs.find((job) => job.id === jobId);

export const replaceJobs = (nextJobs) => {
  jobs = nextJobs;
  notifyJobsChanged();
};

export const updateJob = (jobId, changes) =>
  replaceJobs(jobs.map((job) => (job.id === jobId ? { ...job, ...changes } : job)));

export const patchJobProgress = (jobId, progress) => {
  const job = findJob(jobId);

  if (job) Object.assign(job, progress);

  notifyJobsChanged();
};

export const requeueInterruptedJobs = () => {
  jobs = jobs.map(requeueInterrupted);
};
