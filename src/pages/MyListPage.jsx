import { Activity } from 'react';
import { Link } from 'react-router';
import { PosterCard } from '@/components/anime/PosterCard';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadError } from '@/components/common/LoadError';
import { Pager } from '@/components/common/Pager';
import { SkeletonGrid } from '@/components/common/Skeleton';
import { Tabs } from '@/components/common/Tabs';
import { ImportDialog } from '@/components/library/ImportDialog';
import { WatchStats } from '@/components/library/WatchStats';
import { ROUTES } from '@/constants/routes';
import { useLibrary } from '@/hooks/useLibrary';
import { useMyListTab } from '@/hooks/useMyListTab';
import { useOpenState } from '@/hooks/useOpenState';
import { watchedCount } from '@/utils/watched';

const LOADING_CARD_COUNT = 6;
const STATS_TAB = { id: 'stats', label: 'Stats' };

const EmptyListMessage = ({ onImport }) => (
  <EmptyState
    title="Your list is empty"
    action={
      <div className="cta cta--center">
        <button type="button" className="btn btn--primary" onClick={onImport}>
          Import your list
        </button>

        <Link className="btn" to={ROUTES.browse}>
          Browse anime
        </Link>
      </div>
    }
  >
    Add shows with “My List” on any series, or import your AniList or MyAnimeList list.
  </EmptyState>
);

const ListGrid = ({ seriesList }) => {
  const { watched } = useLibrary();

  const progressLine = (series) => {
    const watchedEpisodes = watchedCount(watched, series.id);

    return watchedEpisodes ? `${watchedEpisodes} / ${series.totalEpisodes ?? series.released} watched` : undefined;
  };

  return (
    <div className="poster-grid">
      {seriesList.map((series) => (
        <PosterCard key={series.id} series={series} line={progressLine(series)} />
      ))}
    </div>
  );
};

const ListTabContent = ({ seriesOnPage, pageInfo, onPageChange, isListEmpty, onImport }) => {
  if (seriesOnPage.error) return <LoadError error={seriesOnPage.error} onRetry={seriesOnPage.retry} />;
  if (seriesOnPage.loading) return <SkeletonGrid count={LOADING_CARD_COUNT} />;

  if (seriesOnPage.data.length) {
    return (
      <>
        <ListGrid seriesList={seriesOnPage.data} />
        <Pager pageInfo={pageInfo} onChange={onPageChange} />
      </>
    );
  }

  if (isListEmpty) return <EmptyListMessage onImport={onImport} />;

  return <EmptyState title="Nothing here yet">No shows with this status.</EmptyState>;
};

export const MyListPage = () => {
  const { isListEmpty, statusTabs, activeStatus, setActiveStatus, seriesOnPage, pageInfo, setPage } = useMyListTab();
  const [isImporting, openImport, closeImport] = useOpenState();

  return (
    <>
      <div className="page-head">
        <h1 className="page-title">My List</h1>

        <button type="button" className="btn btn--sm" onClick={openImport}>
          Import from AniList / MyAnimeList
        </button>
      </div>

      <Tabs tabs={[...statusTabs, STATS_TAB]} value={activeStatus} onChange={setActiveStatus} label="List status" />

      <Activity mode={activeStatus === STATS_TAB.id ? 'visible' : 'hidden'}>
        <WatchStats />
      </Activity>

      {activeStatus !== STATS_TAB.id && (
        <ListTabContent
          seriesOnPage={seriesOnPage}
          pageInfo={pageInfo}
          onPageChange={setPage}
          isListEmpty={isListEmpty}
          onImport={openImport}
        />
      )}

      {isImporting && <ImportDialog onClose={closeImport} />}
    </>
  );
};
