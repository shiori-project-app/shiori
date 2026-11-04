import { useState } from 'react';
import { fetchTopTrending } from '@/api/services/animeService';
import { CompactRow } from '@/components/anime/CompactRow';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import { TOP_TRENDING_COUNT } from '@/config/app.config';
import { useAsync } from '@/hooks/useAsync';
import { useContentFilter } from '@/hooks/usePreferences';

const TRENDING_PERIODS = [
  { id: 'day', label: 'Today' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
];

const TrendingSkeletonRows = () =>
  Array.from({ length: TOP_TRENDING_COUNT }, (_, index) => (
    <li key={index} className="skeleton compact-row--skeleton" />
  ));

export const TopTrending = () => {
  const [period, setPeriod] = useState('day');

  const contentFilter = useContentFilter();

  const {
    data: trendingSeries,
    error,
    loading,
    retry,
  } = useAsync(() => fetchTopTrending(period, contentFilter), [period, contentFilter]);

  return (
    <aside className="panel-list" aria-labelledby="top-trending">
      <div className="panel-list__head">
        <h2 className="section__title" id="top-trending">
          Top Trending
        </h2>

        <SegmentedControl
          role="tablist"
          label="Period"
          options={TRENDING_PERIODS}
          value={period}
          onChange={setPeriod}
        />
      </div>

      {error ? (
        <p className="panel-list__note">
          Couldn’t load trending titles.{' '}
          <button type="button" className="panel-list__retry" onClick={retry}>
            Retry
          </button>
        </p>
      ) : (
        <ol className="compact-list">
          {loading ? (
            <TrendingSkeletonRows />
          ) : (
            trendingSeries.map((series, index) => <CompactRow key={series.id} series={series} rank={index + 1} />)
          )}
        </ol>
      )}
    </aside>
  );
};
