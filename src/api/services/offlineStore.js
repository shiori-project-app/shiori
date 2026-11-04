import {
  hasDesktopBridge,
  loadOfflineLibrary,
  removeOfflineSeries,
  saveOfflineSeries,
  saveOfflineSkipTimes,
} from '@/api/clients/desktopClient';
import { skipTimesKey } from '@/utils/offlineLibrary';

const EMPTY_LIBRARY = { series: {}, skipTimes: {} };

const ignoreSaveFailure = () => {};

let savedLibrary = EMPTY_LIBRARY;
let loadingPromise = null;
const seriesWithLocalFiles = new Set();
const changeListeners = new Set();

const notifyChange = () => changeListeners.forEach((listener) => listener());

export const loadOfflineStore = () => {
  if (!hasDesktopBridge()) return Promise.resolve(savedLibrary);

  loadingPromise ??= loadOfflineLibrary().then(
    (library) => {
      savedLibrary = { series: library?.series ?? {}, skipTimes: library?.skipTimes ?? {} };

      return savedLibrary;
    },
    () => {
      loadingPromise = null;

      return savedLibrary;
    },
  );

  return loadingPromise;
};

export const savedEntries = () => savedLibrary.series;

export const savedEntry = (seriesId) => savedLibrary.series[seriesId] ?? null;

export const savedSkipTimesByKey = () => savedLibrary.skipTimes;

const savedCoverUrl = (seriesId) => `shiori-media://cover/${seriesId}`;

const offlineCopy = (entry) => ({
  ...entry.series,
  cover: savedCoverUrl(entry.series.id),
  coverLarge: savedCoverUrl(entry.series.id),
  banner: null,
  isOfflineCopy: true,
});

export const findOfflineCopy = async (seriesId) => {
  await loadOfflineStore();

  const entry = savedEntry(seriesId);

  return entry ? offlineCopy(entry) : null;
};

export const findSavedEpisodeOffset = async (seriesId) => {
  await loadOfflineStore();

  return savedEntry(seriesId)?.episodeOffset ?? null;
};

export const findSavedEpisodeTitles = async (seriesId) => {
  await loadOfflineStore();

  return savedEntry(seriesId)?.episodeTitles ?? {};
};

export const findSavedSkipTimes = async (malId, episodeNumber) => {
  await loadOfflineStore();

  return savedLibrary.skipTimes[skipTimesKey(malId, episodeNumber)] ?? null;
};

const replaceSavedEntry = (entry) => {
  savedLibrary = { ...savedLibrary, series: { ...savedLibrary.series, [entry.series.id]: entry } };
};

export const saveSeriesOffline = async (entry) => {
  replaceSavedEntry(entry);

  if (hasDesktopBridge()) await saveOfflineSeries(entry).catch(ignoreSaveFailure);
};

export const refreshSavedSeries = (series) => {
  const entry = savedEntry(series.id);

  if (entry) saveSeriesOffline({ ...entry, series, seriesFetchedAt: Date.now() });
};

export const removeSeriesOffline = async (seriesIds) => {
  if (!seriesIds.length) return;

  const removedIds = new Set(seriesIds.map(String));

  savedLibrary = {
    ...savedLibrary,
    series: Object.fromEntries(Object.entries(savedLibrary.series).filter(([seriesId]) => !removedIds.has(seriesId))),
  };

  if (hasDesktopBridge()) await removeOfflineSeries(seriesIds).catch(ignoreSaveFailure);
};

export const saveSkipTimesOffline = async (malId, episodeNumber, skipTimes) => {
  const key = skipTimesKey(malId, episodeNumber);

  savedLibrary = { ...savedLibrary, skipTimes: { ...savedLibrary.skipTimes, [key]: skipTimes } };

  if (hasDesktopBridge()) await saveOfflineSkipTimes(key, skipTimes).catch(ignoreSaveFailure);
};

export const markSeriesWithLocalFiles = (seriesId) => {
  if (seriesWithLocalFiles.has(seriesId)) return;

  seriesWithLocalFiles.add(seriesId);
  notifyChange();
};

export const seriesIdsWithLocalFiles = () => [...seriesWithLocalFiles];

export const onOfflineStoreChange = (listener) => {
  changeListeners.add(listener);

  return () => changeListeners.delete(listener);
};

export const resetOfflineStore = () => {
  savedLibrary = EMPTY_LIBRARY;
  notifyChange();
};
