import { memo, useState } from 'react';
import { fetchWatchOrder } from '@/api/services/franchiseService';
import { CompactRow } from '@/components/anime/CompactRow';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import { WatchedBadge } from '@/components/common/WatchedBadge';
import { WATCH_ORDER_PREVIEW } from '@/config/app.config';
import { useAsync } from '@/hooks/useAsync';
import { useLibrary } from '@/hooks/useLibrary';
import { cx } from '@/utils/classNames';
import { pluralize } from '@/utils/format';
import { collapsedWindow, RELATION_LABELS, seriesWatchProgress } from '@/utils/watchOrder';

const WATCH_ORDER_VIEWS = [
  { id: 'all', label: 'Everything' },
  { id: 'main', label: 'Main story' },
];

const WatchOrderLabels = ({ relation, isCurrent, watchedEpisodes, totalEpisodes, isCompleted }) => (
  <>
    {isCurrent && <span className="watch-order__label is-current">You’re here</span>}
    {relation && <span className="watch-order__label">{RELATION_LABELS[relation]}</span>}
    {isCompleted && <WatchedBadge />}

    {!isCompleted && watchedEpisodes > 0 && (
      <span className="watch-order__label is-progress">
        {watchedEpisodes} / {totalEpisodes} watched
      </span>
    )}
  </>
);

const WatchOrderEntryContent = ({ entry, rank, isCurrent, watchedEpisodes, totalEpisodes, isCompleted }) => (
  <CompactRow
    series={entry.series}
    rank={rank}
    className={cx('watch-order__item', isCurrent && 'is-current')}
    note={
      <WatchOrderLabels
        relation={entry.relation}
        isCurrent={isCurrent}
        watchedEpisodes={watchedEpisodes}
        totalEpisodes={totalEpisodes}
        isCompleted={isCompleted}
      />
    }
  />
);

const WatchOrderEntry = memo(WatchOrderEntryContent);

const LOADING_ROW_COUNT = 4;
const NO_FRANCHISE = [];

const WatchOrderHead = ({ hint }) => (
  <div className="panel-list__head">
    <h2 className="section__title" id="watch-order">
      Watch Order
    </h2>

    {hint && <span className="watch-order__hint">{hint}</span>}
  </div>
);

const WatchOrderLoading = () => (
  <aside className="panel-list watch-order" aria-labelledby="watch-order" aria-busy="true">
    <WatchOrderHead />

    <div className="watch-order__list">
      {Array.from({ length: LOADING_ROW_COUNT }, (_, index) => (
        <div key={index} className="skeleton watch-order__skeleton" />
      ))}
    </div>
  </aside>
);

const toggleExpanded = (expanded) => !expanded;

const WatchOrderPanel = ({ currentSeriesId, franchiseEntries }) => {
  const [view, setView] = useState('all');
  const [isExpanded, setIsExpanded] = useState(false);

  const { list, watched } = useLibrary();

  const hasSideStories = franchiseEntries.some((entry) => !entry.main);
  const entries = view === 'main' ? franchiseEntries.filter((entry) => entry.main) : franchiseEntries;
  const currentIndex = entries.findIndex((entry) => entry.series.id === currentSeriesId);

  const shownWindow = isExpanded
    ? { start: 0, end: entries.length }
    : collapsedWindow(entries.length, currentIndex, WATCH_ORDER_PREVIEW);

  const visibleEntries = entries.slice(shownWindow.start, shownWindow.end);

  return (
    <aside className="panel-list watch-order" aria-labelledby="watch-order">
      <WatchOrderHead hint={`${pluralize(entries.length, 'title')} in release order`} />

      {hasSideStories && (
        <div className="watch-order__bar">
          <SegmentedControl role="tablist" label="Show" options={WATCH_ORDER_VIEWS} value={view} onChange={setView} />
        </div>
      )}

      <ol className="watch-order__list">
        {visibleEntries.map((entry, index) => (
          <WatchOrderEntry
            key={entry.series.id}
            entry={entry}
            rank={shownWindow.start + index + 1}
            isCurrent={entry.series.id === currentSeriesId}
            {...seriesWatchProgress(entry.series, list, watched)}
          />
        ))}
      </ol>

      {entries.length > WATCH_ORDER_PREVIEW && (
        <button
          type="button"
          className="btn btn--ghost btn--sm watch-order__more"
          onClick={() => setIsExpanded(toggleExpanded)}
        >
          {isExpanded ? 'View less' : 'View more'}
        </button>
      )}
    </aside>
  );
};

export const WatchOrder = ({ series }) => {
  const hasNoFranchise = series.hasWatchOrder === false;

  const { data: franchiseEntries, loading } = useAsync(
    () => (hasNoFranchise ? Promise.resolve(NO_FRANCHISE) : fetchWatchOrder(series.id)),
    [series.id, hasNoFranchise],
  );

  if (hasNoFranchise) return null;
  if (loading) return <WatchOrderLoading />;
  if (!franchiseEntries || franchiseEntries.length < 2) return null;

  return <WatchOrderPanel key={series.id} currentSeriesId={series.id} franchiseEntries={franchiseEntries} />;
};
