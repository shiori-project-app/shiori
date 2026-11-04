import { waitForAniListBackgroundTurn } from '@/api/clients/anilistClient';
import { requestEpisodeTitles } from '@/api/services/episodeService';
import {
  loadOfflineStore,
  removeSeriesOffline,
  savedEntries,
  savedEntry,
  savedSkipTimesByKey,
  saveSeriesOffline,
  saveSkipTimesOffline,
  seriesIdsWithLocalFiles,
} from '@/api/services/offlineStore';
import { fetchKnownEpisodeOffset } from '@/api/services/seasonService';
import { refreshSeries } from '@/api/services/seriesRegistry';
import { requestSkipTimes } from '@/api/services/skipService';
import { mapSequentially, sleep } from '@/utils/async';
import {
  episodesNeedingSkipTimes,
  idsNeedingRefresh,
  needsEpisodeTitles,
  prepareFileMatchesInSteps,
  savedIdsToRemove,
  seriesIdsToKeep,
} from '@/utils/offlineLibrary';

const JIKAN_PAUSE_MS = 1200;
const ANISKIP_PAUSE_MS = 300;

const isOnline = () => navigator.onLine;

const previouslySavedTitles = (previousEntry) => ({
  episodeTitles: previousEntry?.episodeTitles ?? {},
  episodeTitlesUpTo: previousEntry?.episodeTitlesUpTo ?? 0,
});

const episodeTitlesToSave = async (series, previousEntry) => {
  if (!needsEpisodeTitles(series, previousEntry)) return previouslySavedTitles(previousEntry);

  const episodeTitles = await requestEpisodeTitles(series, 1, series.released).catch(() => null);

  await sleep(JIKAN_PAUSE_MS);

  return episodeTitles ? { episodeTitles, episodeTitlesUpTo: series.released } : previouslySavedTitles(previousEntry);
};

const episodeOffsetToSave = async (series) => {
  if (!series.hasPrequel) return 0;

  await waitForAniListBackgroundTurn();

  return fetchKnownEpisodeOffset(series.id);
};

const saveFreshSeries = async (series) => {
  if (!isOnline()) return;

  const previousEntry = savedEntry(series.id);
  const episodeOffset = await episodeOffsetToSave(series);

  if (episodeOffset == null) return;

  const titles = await episodeTitlesToSave(series, previousEntry);
  const now = Date.now();

  await saveSeriesOffline({ series, episodeOffset, ...titles, savedAt: now, seriesFetchedAt: now });
};

const saveSkipTimesFor = async ({ malId, episodeNumber }) => {
  if (!isOnline()) return;

  const skipTimes = await requestSkipTimes(malId, episodeNumber).catch(() => null);

  if (skipTimes) await saveSkipTimesOffline(malId, episodeNumber, skipTimes);

  await sleep(ANISKIP_PAUSE_MS);
};

const syncOnce = async ({ list, history, tracked, downloads, files, fileLinks, root }) => {
  const linkInputs = { fileLinks, root };

  await loadOfflineStore();
  await prepareFileMatchesInSteps(savedEntries(), files, linkInputs);

  const keptIds = seriesIdsToKeep({
    list,
    history,
    tracked,
    downloads,
    files,
    fileLinks,
    root,
    seriesWithLocalFiles: seriesIdsWithLocalFiles(),
    savedEntries: savedEntries(),
  });

  await removeSeriesOffline(savedIdsToRemove(keptIds, savedEntries()));

  const staleIds = idsNeedingRefresh(keptIds, savedEntries(), Date.now());
  const freshSeries = staleIds.length && isOnline() ? await refreshSeries(staleIds) : [];

  await mapSequentially(freshSeries, saveFreshSeries);

  await mapSequentially(
    episodesNeedingSkipTimes(savedEntries(), files, savedSkipTimesByKey(), linkInputs),
    saveSkipTimesFor,
  );
};

let runningSync = null;
let nextSyncInputs = null;

const runQueuedSyncs = async (inputs) => {
  await syncOnce(inputs).catch(() => {});

  const queuedInputs = nextSyncInputs;

  nextSyncInputs = null;

  if (queuedInputs) await runQueuedSyncs(queuedInputs);
};

export const requestOfflineSync = (inputs) => {
  if (runningSync) {
    nextSyncInputs = inputs;

    return runningSync;
  }

  runningSync = runQueuedSyncs(inputs).finally(() => {
    runningSync = null;
  });

  return runningSync;
};
