export const PARALLEL_DOWNLOAD_OPTIONS = [1, 2, 3, 4, 5];
export const DEFAULT_PARALLEL_DOWNLOADS = 2;

export const UNLIMITED_SPEED = 0;
export const SPEED_LIMIT_OPTIONS_KBPS = [UNLIMITED_SPEED, 512, 1024, 2048, 5120, 10240, 20480];

const KILOBYTES_PER_MEGABYTE = 1024;

export const speedLimitLabel = (kilobytesPerSecond) => {
  if (kilobytesPerSecond === UNLIMITED_SPEED) return 'Unlimited';

  return kilobytesPerSecond < KILOBYTES_PER_MEGABYTE
    ? `${kilobytesPerSecond} KB/s`
    : `${kilobytesPerSecond / KILOBYTES_PER_MEGABYTE} MB/s`;
};

export const validDownloadSettings = (changes) => ({
  ...(PARALLEL_DOWNLOAD_OPTIONS.includes(changes?.maxParallelDownloads) && {
    maxParallelDownloads: changes.maxParallelDownloads,
  }),

  ...(SPEED_LIMIT_OPTIONS_KBPS.includes(changes?.speedLimitKBps) && { speedLimitKBps: changes.speedLimitKBps }),
});
