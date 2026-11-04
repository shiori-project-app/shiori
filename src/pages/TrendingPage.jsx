import { fetchTrending } from '@/api/services/animeService';
import { PosterGrid } from '@/components/anime/PosterGrid';
import { LoadError } from '@/components/common/LoadError';
import { Pager } from '@/components/common/Pager';
import { SkeletonGrid } from '@/components/common/Skeleton';
import { Footer } from '@/components/layout/Footer';
import { PAGE_SIZE } from '@/config/api.config';
import { useAsync } from '@/hooks/useAsync';
import { usePageParam } from '@/hooks/usePageParam';
import { useContentFilter } from '@/hooks/usePreferences';

const LOADING_CARD_COUNT = 12;

const firstRankOnPage = (pageInfo) => (pageInfo.currentPage - 1) * PAGE_SIZE + 1;

export const TrendingPage = () => {
  const [page, setPage] = usePageParam();
  const contentFilter = useContentFilter();

  const {
    data: trending,
    error,
    loading,
    retry,
  } = useAsync(() => fetchTrending(page, contentFilter), [page, contentFilter]);

  if (error) return <LoadError error={error} onRetry={retry} />;

  return (
    <>
      <h1 className="page-title">Trending</h1>

      {loading ? (
        <SkeletonGrid count={LOADING_CARD_COUNT} />
      ) : (
        <>
          <p className="page-count">Ranked by activity on AniList right now</p>
          <PosterGrid items={trending.items} rankFrom={firstRankOnPage(trending.pageInfo)} />
          <Pager pageInfo={trending.pageInfo} onChange={setPage} />
          <Footer />
        </>
      )}
    </>
  );
};
