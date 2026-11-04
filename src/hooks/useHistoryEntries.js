import { useMemo } from 'react';
import { getCachedSeries, loadSeries } from '@/api/services/seriesRegistry';
import { useAsync } from '@/hooks/useAsync';
import { useLibrary } from '@/hooks/useLibrary';
import { buildEpisode, parseEpisodeId } from '@/utils/episodes';

const historyEntry = (episodeIdText) => {
  const { seriesId, episodeNumber } = parseEpisodeId(episodeIdText);
  const series = getCachedSeries(seriesId);

  return series && episodeNumber <= series.released ? { series, episode: buildEpisode(series, episodeNumber) } : null;
};

export const useHistoryEntries = () => {
  const { history } = useLibrary();

  const seriesIds = history.map((episodeIdText) => parseEpisodeId(episodeIdText).seriesId);

  const seriesLoad = useAsync(() => loadSeries(seriesIds), seriesIds);

  const entries = useMemo(
    () => (seriesLoad.loading ? [] : history.map(historyEntry).filter(Boolean)),
    [seriesLoad.loading, history],
  );

  return { ...seriesLoad, entries };
};
