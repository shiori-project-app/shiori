import { formatBytes } from '@/utils/format';
import { isPending } from '@shared/downloadStates';

const COMPLETE_PERCENT = 100;

const transferredAmount = (download) =>
  download.total ? `${formatBytes(download.received)} of ${formatBytes(download.total)}` : '';

const downloadingText = (download) => {
  if (!download.total) return 'Starting…';

  const percent = Math.floor((download.received / download.total) * COMPLETE_PERCENT);
  const speed = download.speed ? ` · ${formatBytes(download.speed)}/s` : '';

  return `${percent}% · ${transferredAmount(download)}${speed}`;
};

const STATUS_TEXT_BY_STATE = {
  queued: (download) => (download.received ? `Waiting · ${transferredAmount(download)}` : 'Waiting'),
  downloading: downloadingText,
  paused: (download) => (download.total ? `Paused · ${transferredAmount(download)}` : 'Paused'),
  completed: (download) => (download.skipped ? 'Already downloaded' : 'Done'),
  cancelled: () => 'Cancelled',
  failed: (download) => `Failed: ${download.error}`,
};

export const downloadStatusText = (download) =>
  (STATUS_TEXT_BY_STATE[download.state] ?? STATUS_TEXT_BY_STATE.failed)(download);

export const downloadPercent = (download) => {
  if (download.state === 'completed') return COMPLETE_PERCENT;

  return download.total ? (download.received / download.total) * COMPLETE_PERCENT : 0;
};

export const queueSummary = (downloads) => {
  const pendingDownloads = downloads.filter(isPending);

  return {
    hasRunning: pendingDownloads.some((download) => download.state !== 'paused'),
    hasPaused: pendingDownloads.some((download) => download.state === 'paused'),
    hasFinished: downloads.some((download) => !isPending(download)),
  };
};
