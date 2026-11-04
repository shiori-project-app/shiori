import { getSettings } from '../ipc/settings.js';

const BYTES_PER_KILOBYTE = 1024;
const MILLISECONDS_PER_SECOND = 1000;

const tokenBucket = { availableBytes: 0, refilledAt: Date.now() };

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const bytesPerSecondLimit = () => (getSettings().speedLimitKBps || 0) * BYTES_PER_KILOBYTE;

export const waitForBandwidth = async (byteCount) => {
  const limit = bytesPerSecondLimit();

  if (!limit) return;

  const now = Date.now();
  const elapsedSeconds = (now - tokenBucket.refilledAt) / MILLISECONDS_PER_SECOND;

  tokenBucket.availableBytes = Math.min(limit, tokenBucket.availableBytes + elapsedSeconds * limit) - byteCount;
  tokenBucket.refilledAt = now;

  if (tokenBucket.availableBytes < 0) await sleep((-tokenBucket.availableBytes / limit) * MILLISECONDS_PER_SECOND);
};
