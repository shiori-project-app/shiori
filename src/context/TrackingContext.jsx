import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { onSystemResume, showMainWindow } from '@/api/clients/desktopClient';
import { checkTrackedShow } from '@/api/services/trackingService';
import { TRACKING_FIRST_CHECK_DELAY_MS } from '@/config/app.config';
import { LocalFilesContext } from '@/context/LocalFilesContext';
import { useDownloads } from '@/hooks/useDownloads';
import { useLibrary } from '@/hooks/useLibrary';
import { useUserDataState } from '@/hooks/usePersistentState';
import { useToast } from '@/hooks/useToast';
import { mapSequentially } from '@/utils/async';
import { withoutKey } from '@/utils/library';
import { nextCheckDelay, withCheckResult, withEpisodesHandled, withQueuedCheck } from '@/utils/trackingSchedule';

export const TrackingContext = createContext(null);

const showSystemNotification = (body) => {
  try {
    const notification = new Notification('Shiori', { body });

    notification.onclick = showMainWindow;
  } catch {
    return;
  }
};

const failedCheck = (error) => ({ done: [], waitingForRelease: true, message: `Check failed: ${error.message}` });

const UNREACHABLE_FOLDER_CHECK = {
  done: [],
  waitingForRelease: true,
  message: 'Your download folder can’t be reached. Shiori will check again later.',
};

const useTrackedShowChecks = ({ tracked, setTracked }) => {
  const { downloads, queueEpisodes } = useDownloads();
  const { rescan } = useContext(LocalFilesContext);
  const { fileLinks } = useLibrary();
  const showToast = useToast();

  const [checking, setChecking] = useState(false);
  const latestState = useRef({ tracked, downloads, fileLinks });
  const isCheckRunning = useRef(false);
  const queuedChecks = useRef([]);

  useEffect(() => {
    latestState.current = { tracked, downloads, fileLinks };
  }, [tracked, downloads, fileLinks]);

  const recordCheckResult = useCallback(
    (seriesId, checkResult) =>
      setTracked((allTracked) =>
        allTracked[seriesId]
          ? { ...allTracked, [seriesId]: withCheckResult(allTracked[seriesId], checkResult) }
          : allTracked,
      ),
    [setTracked],
  );

  const announceNewEpisodes = useCallback(
    (newEpisodeDescriptions) => {
      if (!newEpisodeDescriptions.length) return;

      const message = `New episodes: ${newEpisodeDescriptions.join(' · ')}`;

      showToast(message);
      showSystemNotification(message);
    },
    [showToast],
  );

  const check = useCallback(
    async (onlySeriesId, justSavedEntries = {}) => {
      if (isCheckRunning.current) {
        queuedChecks.current = withQueuedCheck(queuedChecks.current, { onlySeriesId, justSavedEntries });

        return;
      }

      isCheckRunning.current = true;
      setChecking(true);

      try {
        const { root, files, isUnreachable } = await rescan();

        const entriesToCheck = Object.entries({ ...latestState.current.tracked, ...justSavedEntries }).filter(
          ([seriesId]) => onlySeriesId == null || Number(seriesId) === onlySeriesId,
        );

        const checkResults = await mapSequentially(entriesToCheck, async ([seriesId, entry]) => {
          const checkResult = isUnreachable
            ? UNREACHABLE_FOLDER_CHECK
            : await checkTrackedShow({
                seriesId: Number(seriesId),
                entry,
                files,
                root,
                downloads: latestState.current.downloads,
                fileLinks: latestState.current.fileLinks,
                queueEpisodes,
              }).catch(failedCheck);

          recordCheckResult(seriesId, checkResult);

          return checkResult;
        });

        announceNewEpisodes(
          checkResults
            .filter((checkResult) => checkResult.done.length)
            .map((checkResult) => `${checkResult.series.title} EP ${checkResult.done.join(', ')}`),
        );
      } finally {
        isCheckRunning.current = false;
        setChecking(false);

        const [nextCheck, ...laterChecks] = queuedChecks.current;

        queuedChecks.current = laterChecks;

        if (nextCheck) check(nextCheck.onlySeriesId, nextCheck.justSavedEntries);
      }
    },
    [rescan, queueEpisodes, recordCheckResult, announceNewEpisodes],
  );

  return { checking, check, latestState };
};

const useCheckSchedule = (tracked, check) => {
  const [nextCheckAt, setNextCheckAt] = useState(null);

  useEffect(() => {
    if (!window.shiori) return;

    const firstCheckTimer = setTimeout(() => check(), TRACKING_FIRST_CHECK_DELAY_MS);
    const unsubscribe = onSystemResume(() => check());

    return () => {
      clearTimeout(firstCheckTimer);
      unsubscribe();
    };
  }, [check]);

  useEffect(() => {
    if (!window.shiori || !Object.keys(tracked).length) {
      setNextCheckAt(null);

      return;
    }

    const delay = nextCheckDelay(tracked, Date.now());

    setNextCheckAt(Date.now() + delay);

    const scheduledCheckTimer = setTimeout(() => check(), delay);

    return () => clearTimeout(scheduledCheckTimer);
  }, [tracked, check]);

  return nextCheckAt;
};

export const TrackingProvider = ({ children }) => {
  const [tracked, setTracked] = useUserDataState('tracking', {});

  const { checking, check, latestState } = useTrackedShowChecks({ tracked, setTracked });
  const nextCheckAt = useCheckSchedule(tracked, check);

  const track = useCallback(
    (series, options) => {
      const entry = {
        handled: [],
        addedAt: Date.now(),
        ...latestState.current.tracked[series.id],
        ...options,
        title: series.title,
      };

      setTracked((allTracked) => ({ ...allTracked, [series.id]: entry }));
      check(series.id, { [series.id]: entry });
    },
    [check, latestState, setTracked],
  );

  const untrack = useCallback((seriesId) => setTracked((allTracked) => withoutKey(allTracked, seriesId)), [setTracked]);

  const checkNow = useCallback((seriesId) => check(seriesId), [check]);

  const markEpisodesHandled = useCallback(
    (seriesId, episodeNumbers) =>
      setTracked((allTracked) =>
        allTracked[seriesId]
          ? { ...allTracked, [seriesId]: withEpisodesHandled(allTracked[seriesId], episodeNumbers) }
          : allTracked,
      ),
    [setTracked],
  );

  const value = useMemo(
    () => ({ tracked, checking, nextCheckAt, track, untrack, checkNow, markEpisodesHandled }),
    [tracked, checking, nextCheckAt, track, untrack, checkNow, markEpisodesHandled],
  );

  return <TrackingContext value={value}>{children}</TrackingContext>;
};
