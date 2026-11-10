import fs from 'node:fs';
import { logError } from './logger.js';
import { readVideoResolution } from './videoResolutionReader.js';

const MAX_PARALLEL_FILE_CHECKS = 2;
const FAILED_READ_RETRY_DELAY_MS = 60000;

const knownResolutionsByPath = new Map();
const checksWaitingForSlot = [];
let runningCheckCount = 0;

const takeCheckSlot = () => {
  if (runningCheckCount < MAX_PARALLEL_FILE_CHECKS) {
    runningCheckCount += 1;

    return Promise.resolve();
  }

  return new Promise((resolve) => checksWaitingForSlot.push(resolve));
};

const releaseCheckSlot = () => {
  const nextCheck = checksWaitingForSlot.shift();

  if (nextCheck) nextCheck();
  else runningCheckCount -= 1;
};

const withCheckSlot = async (check) => {
  await takeCheckSlot();

  try {
    return await check();
  } finally {
    releaseCheckSlot();
  }
};

const canReuse = (knownResolution, fileVersion) =>
  knownResolution?.fileVersion === fileVersion &&
  (knownResolution.retryAfter === null || Date.now() < knownResolution.retryAfter);

const startReading = (videoPath, fileVersion, hasLoggedFailure) => {
  const knownResolution = { fileVersion, retryAfter: null, hasLoggedFailure };

  knownResolution.resolution = readVideoResolution(videoPath).catch((error) => {
    if (!hasLoggedFailure) logError(`Could not read the resolution of ${videoPath}`, error);

    knownResolution.retryAfter = Date.now() + FAILED_READ_RETRY_DELAY_MS;
    knownResolution.hasLoggedFailure = true;

    return null;
  });

  knownResolutionsByPath.set(videoPath, knownResolution);

  return knownResolution.resolution;
};

const rememberedVideoResolution = async (videoPath) => {
  const stats = await fs.promises.stat(videoPath).catch(() => null);

  if (!stats) {
    knownResolutionsByPath.delete(videoPath);

    return null;
  }

  const fileVersion = `${stats.size}|${stats.mtimeMs}`;
  const knownResolution = knownResolutionsByPath.get(videoPath);

  if (canReuse(knownResolution, fileVersion)) return knownResolution.resolution;

  const failedBeforeUnchanged = knownResolution?.fileVersion === fileVersion && knownResolution.hasLoggedFailure;

  return startReading(videoPath, fileVersion, failedBeforeUnchanged);
};

const resolutionOfFileOrNull = async (fileKey, videoPathOf) => {
  try {
    return await withCheckSlot(() => rememberedVideoResolution(videoPathOf(fileKey)));
  } catch {
    return null;
  }
};

export const videoResolutionsOf = async (fileKeys, videoPathOf = (fileKey) => fileKey) =>
  Object.fromEntries(
    await Promise.all(fileKeys.map(async (fileKey) => [fileKey, await resolutionOfFileOrNull(fileKey, videoPathOf)])),
  );
