import { anilistQuery } from '@/api/clients/anilistClient';
import { mapMedia } from '@/api/mappers/mediaMapper';
import { BY_IDS_QUERY, BY_MAL_IDS_QUERY } from '@/api/queries/anilistQueries';
import { findOfflineCopy, loadOfflineStore, refreshSavedSeries, savedEntry } from '@/api/services/offlineStore';
import { ANILIST_MAX_IDS_PER_REQUEST } from '@/config/api.config';
import { chunk } from '@/utils/arrays';
import { mapSequentially } from '@/utils/async';
import { hasNextEpisodeAired, isSavedSeriesFresh } from '@/utils/offlineLibrary';

const seriesById = new Map();
const offlineCopiesById = new Map();

const isValidId = (id) => Number.isInteger(id) && id > 0;

const keepNewestCopy = (series) => {
  const loadedCopy = seriesById.get(series.id);

  if (loadedCopy?.released > series.released) return loadedCopy;

  seriesById.set(series.id, series);

  return series;
};

const rememberRequestedMedia = (media) => keepNewestCopy(mapMedia(media));

export const rememberMedia = (media) => {
  const series = mapMedia(media);
  const mayBeOutOfDate = !navigator.onLine || hasNextEpisodeAired(series, Date.now());

  return mayBeOutOfDate ? (seriesById.get(series.id) ?? series) : keepNewestCopy(series);
};

export const getCachedSeries = (seriesId) => seriesById.get(seriesId) ?? offlineCopiesById.get(seriesId);

export const allCachedSeries = () => [...seriesById.values()];

const fetchInChunks = async (ids, query, queryOptions) =>
  (
    await mapSequentially(chunk(ids, ANILIST_MAX_IDS_PER_REQUEST), async (idsChunk) => {
      const data = await anilistQuery(query, { ids: idsChunk }, queryOptions);

      return data.Page.media.map(rememberRequestedMedia);
    })
  ).flat();

const fetchFullSeries = async (seriesIds, queryOptions) => {
  const fetchedSeries = await fetchInChunks(seriesIds, BY_IDS_QUERY, queryOptions);

  fetchedSeries.forEach(refreshSavedSeries);

  return fetchedSeries;
};

const fallBackToOfflineCopies = async (seriesIds, error) => {
  const stillMissingIds = seriesIds.filter((seriesId) => !seriesById.has(seriesId));
  const offlineCopies = (await Promise.all(stillMissingIds.map(findOfflineCopy))).filter(Boolean);

  if (stillMissingIds.length && !offlineCopies.length) throw error;

  offlineCopies.forEach((offlineCopy) => offlineCopiesById.set(offlineCopy.id, offlineCopy));
};

const rememberFreshSavedSeries = async (seriesIds) => {
  if (!navigator.onLine) return;

  await loadOfflineStore();

  const now = Date.now();

  seriesIds
    .map(savedEntry)
    .filter((entry) => entry && isSavedSeriesFresh(entry, now))
    .forEach((entry) => seriesById.set(entry.series.id, entry.series));
};

const idsNotLoaded = (seriesIds) => seriesIds.filter((seriesId) => isValidId(seriesId) && !seriesById.has(seriesId));

export const loadSeries = async (seriesIds) => {
  const uniqueIds = [...new Set(seriesIds)];

  await rememberFreshSavedSeries(idsNotLoaded(uniqueIds));

  const missingIds = idsNotLoaded(uniqueIds);

  await fetchFullSeries(missingIds).catch((error) => fallBackToOfflineCopies(missingIds, error));
};

export const refreshSeries = (seriesIds) => fetchFullSeries(seriesIds, { cache: false, background: true });

export const fetchSeriesByMalIds = async (malIds) => {
  const uniqueMalIds = [...new Set(malIds)].filter(isValidId);
  const foundSeries = await fetchInChunks(uniqueMalIds, BY_MAL_IDS_QUERY);

  return new Map(foundSeries.map((series) => [series.malId, series]));
};

export const fetchSeries = async (seriesId) => {
  await loadSeries([seriesId]);

  return getCachedSeries(seriesId) ?? null;
};

export const forgetLoadedSeries = () => {
  seriesById.clear();
  offlineCopiesById.clear();
};
