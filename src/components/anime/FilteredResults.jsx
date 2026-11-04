import { PosterGrid } from '@/components/anime/PosterGrid';
import { EmptyState } from '@/components/common/EmptyState';
import { Pager } from '@/components/common/Pager';
import { SkeletonGrid } from '@/components/common/Skeleton';

const LOADING_CARD_COUNT = 12;

export const FilteredResults = ({ results, isLoading, onPageChange, emptyTitle, emptyMessage }) => {
  if (isLoading) return <SkeletonGrid count={LOADING_CARD_COUNT} />;
  if (!results.items.length) return <EmptyState title={emptyTitle}>{emptyMessage}</EmptyState>;

  return (
    <>
      <PosterGrid items={results.items} />
      <Pager pageInfo={results.pageInfo} onChange={onPageChange} />
    </>
  );
};
