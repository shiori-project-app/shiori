import { once } from 'node:events';
import fs from 'node:fs';
import path from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { net } from 'electron';
import { DEFAULT_PARALLEL_DOWNLOADS } from '../../shared/downloadLimits.js';
import { getSettings } from '../ipc/settings.js';
import { logError } from '../logger.js';
import { allJobs, patchJobProgress, updateJob } from './queueStore.js';
import { waitForBandwidth } from './speedLimiter.js';

const PARTIAL_CONTENT = 206;
const RANGE_NOT_SATISFIABLE = 416;
const SPEED_SAMPLE_MS = 1000;
const MILLISECONDS_PER_SECOND = 1000;
export const STALL_TIMEOUT_MS = 60000;

const STALLED_ERROR_NAME = 'StalledDownloadError';
const CONTENT_RANGE = /^bytes (\d+)-\d+\/(\d+|\*)$/;
const UNKNOWN_FILE_SIZE = '*';
const WEAK_ENTITY_TAG_PREFIX = 'W/';
const EMPTY_CONTENT_LENGTH = '0';

const PARTIAL_FILE_MISMATCH_MESSAGE =
  'The partial file no longer matches the server’s copy. Retry to download it again.';

const WEB_PAGE_CONTENT_TYPE = /^(text\/html|application\/xhtml|application\/json)/i;
const WEB_PAGE_MESSAGE = 'The server sent a web page instead of the video. Retry to try again.';
const NO_DATA_MESSAGE = 'The server sent no data. Retry to try again.';

const createStalledError = () =>
  Object.assign(new Error('The connection stalled. Retry to continue from where it stopped.'), {
    name: STALLED_ERROR_NAME,
  });

const stoppedBecauseStalled = (signal) => signal.reason?.name === STALLED_ERROR_NAME;

const runningControllers = new Map();
const transfersInProgress = new Map();

const maxParallelDownloads = () => getSettings().maxParallelDownloads ?? DEFAULT_PARALLEL_DOWNLOADS;

export const waitForTransferToStop = (jobId) => transfersInProgress.get(jobId) ?? Promise.resolve();

export const stopDownload = (jobId) => {
  runningControllers.get(jobId)?.abort();
  runningControllers.delete(jobId);
};

export const stopAllDownloads = () => [...runningControllers.keys()].forEach(stopDownload);

const partialFilePath = (job) => `${job.savePath}.part`;

const existingPartialSize = (partPath) => (fs.existsSync(partPath) ? fs.statSync(partPath).size : 0);

const createStallWatchdog = (controller) => {
  let stallTimer = null;

  const recordActivity = () => {
    clearTimeout(stallTimer);
    stallTimer = setTimeout(() => controller.abort(createStalledError()), STALL_TIMEOUT_MS);
  };

  const stopWatching = () => clearTimeout(stallTimer);

  recordActivity();

  return { recordActivity, stopWatching };
};

const createProgressMeter = (jobId, initialBytes, onActivity) => {
  let receivedBytes = initialBytes;
  let speedSample = { time: Date.now(), bytes: initialBytes };

  const meter = new Transform({
    transform: async (chunk, _encoding, done) => {
      onActivity();
      await waitForBandwidth(chunk.length);
      receivedBytes += chunk.length;

      const now = Date.now();
      const progress = { received: receivedBytes };

      if (now - speedSample.time >= SPEED_SAMPLE_MS) {
        progress.speed = Math.round(
          (receivedBytes - speedSample.bytes) / ((now - speedSample.time) / MILLISECONDS_PER_SECOND),
        );

        speedSample = { time: now, bytes: receivedBytes };
      }

      patchJobProgress(jobId, progress);
      done(null, chunk);
    },
  });

  return { meter, receivedBytes: () => receivedBytes };
};

const assertCompleteTransfer = (receivedBytes, expectedBytes, hasKnownLength) => {
  if (hasKnownLength && receivedBytes !== expectedBytes) {
    throw new Error(
      `The download ended early (${receivedBytes} of ${expectedBytes} bytes). Retry to continue from where it stopped.`,
    );
  }
};

const assertFileMatchesTransfer = (partPath, expectedBytes, hasKnownLength) => {
  if (!hasKnownLength || existingPartialSize(partPath) === expectedBytes) return;

  fs.rmSync(partPath, { force: true });

  throw new Error('The downloaded file came out the wrong size. Retry to download it again.');
};

const closedStream = async (stream) => {
  if (!stream.closed) await once(stream, 'close').catch(() => {});
};

const finishDownload = (job, partPath, byteCount) => {
  fs.renameSync(partPath, job.savePath);
  updateJob(job.id, { state: 'completed', received: byteCount, total: byteCount, speed: 0 });
};

const discardMismatchedPartialFile = (partPath) => {
  fs.rmSync(partPath, { force: true });

  throw new Error(PARTIAL_FILE_MISMATCH_MESSAGE);
};

const handleUnresumableRange = (job, partPath, response, resumeOffset) => {
  if (response.headers.get('content-range') !== `bytes */${resumeOffset}`) discardMismatchedPartialFile(partPath);

  finishDownload(job, partPath, resumeOffset);
};

const resumableBytes = (job, partPath) => (job.total > 0 ? existingPartialSize(partPath) : 0);

const resumeHeaders = (job, resumeOffset) =>
  resumeOffset
    ? { Range: `bytes=${resumeOffset}-`, ...(job.resumeValidator ? { 'If-Range': job.resumeValidator } : {}) }
    : {};

const resumeValidatorOf = ({ headers }) => {
  const entityTag = headers.get('etag');

  return entityTag && !entityTag.startsWith(WEAK_ENTITY_TAG_PREFIX) ? entityTag : headers.get('last-modified');
};

const servedRequestedRange = (response, job, resumeOffset) => {
  const contentRange = CONTENT_RANGE.exec(response.headers.get('content-range') ?? '');

  if (!contentRange) return false;

  const [, firstByte, fileSize] = contentRange;

  return Number(firstByte) === resumeOffset && (fileSize === UNKNOWN_FILE_SIZE || Number(fileSize) === job.total);
};

const transferToFile = async (job, controller, stallWatchdog) => {
  const partPath = partialFilePath(job);

  fs.mkdirSync(path.dirname(job.savePath), { recursive: true });

  const resumeOffset = resumableBytes(job, partPath);

  updateJob(job.id, { state: 'downloading', error: null, received: resumeOffset });

  const response = await net.fetch(job.url, { headers: resumeHeaders(job, resumeOffset), signal: controller.signal });

  stallWatchdog.recordActivity();

  if (response.status === RANGE_NOT_SATISFIABLE && resumeOffset) {
    handleUnresumableRange(job, partPath, response, resumeOffset);

    return;
  }

  if (!response.ok) throw new Error(`The server responded with ${response.status}`);

  const contentLength = response.headers.get('content-length');

  if (!response.body || contentLength === EMPTY_CONTENT_LENGTH) throw new Error(NO_DATA_MESSAGE);
  if (WEB_PAGE_CONTENT_TYPE.test(response.headers.get('content-type') ?? '')) throw new Error(WEB_PAGE_MESSAGE);

  const isResumed = response.status === PARTIAL_CONTENT;

  if (isResumed && !servedRequestedRange(response, job, resumeOffset)) discardMismatchedPartialFile(partPath);

  const startingBytes = isResumed ? resumeOffset : 0;
  const totalBytes = startingBytes + Number(contentLength || 0);

  updateJob(job.id, {
    received: startingBytes,
    total: totalBytes,
    ...(isResumed ? {} : { resumeValidator: resumeValidatorOf(response) }),
  });

  const progress = createProgressMeter(job.id, startingBytes, stallWatchdog.recordActivity);
  const responseBytes = Readable.fromWeb(response.body);

  const partFile = fs.createWriteStream(partPath, { flags: isResumed ? 'a' : 'w' });

  try {
    await pipeline(responseBytes, progress.meter, partFile);
  } finally {
    partFile.destroy();
    await closedStream(partFile);
  }

  assertCompleteTransfer(progress.receivedBytes(), totalBytes, Boolean(contentLength));
  assertFileMatchesTransfer(partPath, totalBytes, Boolean(contentLength));
  finishDownload(job, partPath, progress.receivedBytes());
};

const failureMessage = (error, signal) => (stoppedBecauseStalled(signal) ? signal.reason.message : error.message);

const isDeliberateStop = (signal) => signal.aborted && !stoppedBecauseStalled(signal);

const transferJob = async (job, controller) => {
  if (controller.signal.aborted) return;

  if (fs.existsSync(job.savePath)) {
    updateJob(job.id, { state: 'completed', skipped: true });

    return;
  }

  const stallWatchdog = createStallWatchdog(controller);

  try {
    await transferToFile(job, controller, stallWatchdog);
  } catch (error) {
    if (!isDeliberateStop(controller.signal)) {
      const message = failureMessage(error, controller.signal);

      logError(`Download failed: ${job.label}`, message);
      updateJob(job.id, { state: 'failed', error: message, speed: 0 });
    }
  } finally {
    stallWatchdog.stopWatching();
  }
};

const runDownload = (job) => {
  const controller = new AbortController();

  runningControllers.set(job.id, controller);

  const transfer = waitForTransferToStop(job.id)
    .then(() => transferJob(job, controller))
    .finally(() => {
      if (runningControllers.get(job.id) === controller) runningControllers.delete(job.id);
      if (transfersInProgress.get(job.id) === transfer) transfersInProgress.delete(job.id);

      startQueuedDownloads();
    });

  transfersInProgress.set(job.id, transfer);
};

export const startQueuedDownloads = () => {
  allJobs().some((job) => {
    if (runningControllers.size >= maxParallelDownloads()) return true;
    if (job.state === 'queued' && !runningControllers.has(job.id)) runDownload(job);

    return false;
  });
};

export const applyParallelLimit = () => {
  allJobs()
    .filter((job) => runningControllers.has(job.id))
    .slice(maxParallelDownloads())
    .forEach((job) => {
      stopDownload(job.id);
      updateJob(job.id, { state: 'queued', speed: 0 });
    });

  startQueuedDownloads();
};
