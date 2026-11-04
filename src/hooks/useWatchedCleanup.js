import { useCallback, useContext, useState } from 'react';
import { cleanUpFile, getDownloadFolderUsage } from '@/api/clients/desktopClient';
import { findWatchedEpisodesToClean } from '@/api/services/watchedCleanupService';
import { LocalFilesContext } from '@/context/LocalFilesContext';
import { useAsync } from '@/hooks/useAsync';
import { useLibrary } from '@/hooks/useLibrary';
import { usePreferences } from '@/hooks/usePreferences';
import { useTracking } from '@/hooks/useTracking';
import { mapSequentially } from '@/utils/async';
import { episodesBySeries, initiallySelectedPaths } from '@/utils/watchedCleanup';

export const CLEANUP_PHASES = {
  idle: 'idle',
  finding: 'finding',
  reviewing: 'reviewing',
  cleaning: 'cleaning',
  finished: 'finished',
};

const withPathToggled = (paths, path) => {
  const nextPaths = new Set(paths);

  if (!nextPaths.delete(path)) nextPaths.add(path);

  return nextPaths;
};

const summarizeResults = (results) => ({
  cleaned: results.filter((result) => !result.failure),
  failed: results.filter((result) => result.failure),
});

const cleanCandidate = async (candidate, action) => {
  try {
    const { bytes } = await cleanUpFile({ relativePath: candidate.path, action });

    return { candidate, bytes };
  } catch (error) {
    return { candidate, failure: error.message };
  }
};

export const useWatchedCleanup = () => {
  const { watched, watchDates, fileLinks } = useLibrary();
  const { rescan } = useContext(LocalFilesContext);
  const { cleanupAfterDays, cleanupAction } = usePreferences();
  const { markEpisodesHandled } = useTracking();

  const [phase, setPhase] = useState(CLEANUP_PHASES.idle);
  const [review, setReview] = useState(null);
  const [selectedPaths, setSelectedPaths] = useState(new Set());
  const [cleanedCount, setCleanedCount] = useState(0);
  const [outcome, setOutcome] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [usageVersion, setUsageVersion] = useState(0);

  const usage = useAsync(getDownloadFolderUsage, [usageVersion]);

  const findEpisodes = async () => {
    setPhase(CLEANUP_PHASES.finding);
    setErrorMessage(null);

    try {
      const scan = await rescan();

      if (scan.isUnreachable) throw new Error('Your download folder can’t be reached. Is the drive connected?');

      const foundEpisodes = await findWatchedEpisodesToClean({
        scan,
        library: { watched, watchDates },
        fileLinks,
        afterDays: cleanupAfterDays,
      });

      setReview(foundEpisodes);
      setSelectedPaths(initiallySelectedPaths(foundEpisodes.candidates));
      setPhase(CLEANUP_PHASES.reviewing);
    } catch (error) {
      setErrorMessage(error.message);
      setPhase(CLEANUP_PHASES.idle);
    }
  };

  const toggleCandidate = useCallback((path) => setSelectedPaths((paths) => withPathToggled(paths, path)), []);

  const confirmCleanup = useCallback(async () => {
    const chosenCandidates = review.candidates.filter((candidate) => selectedPaths.has(candidate.path));

    setPhase(CLEANUP_PHASES.cleaning);
    setCleanedCount(0);

    episodesBySeries(chosenCandidates).forEach((episodeNumbers, seriesId) =>
      markEpisodesHandled(seriesId, episodeNumbers),
    );

    const results = await mapSequentially(chosenCandidates, async (candidate) => {
      const result = await cleanCandidate(candidate, cleanupAction);

      setCleanedCount((count) => count + 1);

      return result;
    });

    await rescan();
    setOutcome(summarizeResults(results));
    setUsageVersion((version) => version + 1);
    setPhase(CLEANUP_PHASES.finished);
  }, [review, selectedPaths, cleanupAction, markEpisodesHandled, rescan]);

  const closeReview = useCallback(() => {
    setPhase(CLEANUP_PHASES.idle);
    setReview(null);
    setOutcome(null);
  }, []);

  return {
    usage: usage.data ?? null,
    phase,
    review,
    selectedPaths,
    cleanedCount,
    outcome,
    errorMessage,
    findEpisodes,
    toggleCandidate,
    confirmCleanup,
    closeReview,
  };
};
