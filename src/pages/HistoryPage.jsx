import { EpisodeCard } from '@/components/anime/EpisodeCard';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadError } from '@/components/common/LoadError';
import { Pager } from '@/components/common/Pager';
import { SkeletonGrid } from '@/components/common/Skeleton';
import { useHistoryEntries } from '@/hooks/useHistoryEntries';
import { useLibrary } from '@/hooks/useLibrary';
import { usePagedList } from '@/hooks/usePagedList';

const LOADING_CARD_COUNT = 6;

const HistoryEntries = ({ entries, onClear }) => {
  const { pageItems, pageInfo, setPage } = usePagedList(entries);

  return (
    <>
      <div className="history__actions">
        <button type="button" className="btn btn--sm" onClick={onClear}>
          Clear history
        </button>
      </div>

      <div className="episode-grid">
        {pageItems.map(({ series, episode }) => (
          <EpisodeCard key={episode.id} series={series} episode={episode} showProgress />
        ))}
      </div>

      <Pager pageInfo={pageInfo} onChange={setPage} />
    </>
  );
};

export const HistoryPage = () => {
  const { clearHistory } = useLibrary();
  const { entries, error, loading, retry } = useHistoryEntries();

  if (error) return <LoadError error={error} onRetry={retry} />;

  return (
    <>
      <h1 className="page-title">History</h1>
      {loading && <SkeletonGrid count={LOADING_CARD_COUNT} />}
      {!loading && entries.length > 0 && <HistoryEntries entries={entries} onClear={clearHistory} />}

      {!loading && !entries.length && (
        <EmptyState title="No watch history">Episodes you watch will appear here.</EmptyState>
      )}
    </>
  );
};
