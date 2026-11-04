import { fetchSeries } from '@/api/services/seriesRegistry';
import { useAsync } from '@/hooks/useAsync';

export const useSeries = (seriesId) => useAsync(() => fetchSeries(seriesId), [seriesId]);
