import { getCachedSeries, loadSeries } from '@/api/services/seriesRegistry';
import { toMalXml } from '@/utils/malExport';

export const buildMalExport = async (list, watched) => {
  const seriesIds = Object.keys(list).map(Number);

  await loadSeries(seriesIds);

  const loadedIds = seriesIds.filter((seriesId) => getCachedSeries(seriesId));

  const unavailableTitles = seriesIds
    .filter((seriesId) => !getCachedSeries(seriesId))
    .map((seriesId) => `AniList #${seriesId}`);

  const entries = loadedIds.map((seriesId) => ({
    series: getCachedSeries(seriesId),
    status: list[seriesId].status,
    watched: watched[seriesId] ?? [],
  }));

  const exported = toMalXml(entries);

  return { ...exported, skipped: [...exported.skipped, ...unavailableTitles] };
};
