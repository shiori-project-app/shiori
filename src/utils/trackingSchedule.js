import {
  TRACKING_FALLBACK_MS,
  TRACKING_MIN_DELAY_MS,
  TRACKING_RELEASE_LAG_MS,
  TRACKING_RETRY_MS,
} from '@/config/app.config';

const MILLISECONDS_PER_SECOND = 1000;

const entryDueTimes = (entry, now) => [
  ...(entry.nextAiringAt ? [entry.nextAiringAt * MILLISECONDS_PER_SECOND + TRACKING_RELEASE_LAG_MS] : []),
  ...(entry.waitingForRelease ? [(entry.lastCheckedAt ?? now) + TRACKING_RETRY_MS] : []),
];

export const nextCheckDelay = (tracked, now) => {
  const earliestDue = Math.min(
    now + TRACKING_FALLBACK_MS,
    ...Object.values(tracked).flatMap((entry) => entryDueTimes(entry, now)),
  );

  return Math.max(TRACKING_MIN_DELAY_MS, earliestDue - now);
};

export const withCheckResult = (entry, checkResult) => ({
  ...entry,
  handled: [...new Set([...entry.handled, ...checkResult.done])],
  lastCheckedAt: Date.now(),
  lastResult: checkResult.message,
  nextAiringAt: checkResult.series?.nextAiringAt ?? null,
  waitingForRelease: Boolean(checkResult.waitingForRelease),
});

export const withEpisodesHandled = (entry, episodeNumbers) => ({
  ...entry,
  handled: [...new Set([...entry.handled, ...episodeNumbers])],
});

export const withQueuedCheck = (queuedChecks, check) => {
  if (queuedChecks.some((queued) => queued.onlySeriesId == null)) return queuedChecks;
  if (check.onlySeriesId == null) return [check];

  return [...queuedChecks.filter((queued) => queued.onlySeriesId !== check.onlySeriesId), check];
};
