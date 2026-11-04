import { useMemo } from 'react';
import { getCachedSeries, loadSeries } from '@/api/services/seriesRegistry';
import { STATS_GENRE_COUNT, STATS_MONTH_COUNT } from '@/config/app.config';
import { useAsync } from '@/hooks/useAsync';
import { useLibrary } from '@/hooks/useLibrary';
import { watchStats } from '@/utils/watchStats';

export const useWatchStats = () => {
  const { watched, watchDates } = useLibrary();

  const seriesIds = Object.keys(watched).map(Number);

  const seriesLoad = useAsync(() => loadSeries(seriesIds), seriesIds);

  const stats = useMemo(
    () =>
      seriesLoad.loading
        ? null
        : watchStats({
            watched,
            watchDates,
            seriesById: getCachedSeries,
            genreCount: STATS_GENRE_COUNT,
            monthCount: STATS_MONTH_COUNT,
          }),
    [seriesLoad.loading, watched, watchDates],
  );

  return { ...seriesLoad, stats };
};
