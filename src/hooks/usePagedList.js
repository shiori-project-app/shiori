import { useMemo } from 'react';
import { LIST_PAGE_SIZE } from '@/config/app.config';
import { usePageParam } from '@/hooks/usePageParam';
import { clampPage, localPageInfo, pageCount, pageSlice } from '@/utils/pagination';

export const usePagedList = (items, pageSize = LIST_PAGE_SIZE) => {
  const [requestedPage, setPage] = usePageParam();

  const lastPage = pageCount(items.length, pageSize);
  const currentPage = clampPage(requestedPage, lastPage);

  const pageItems = useMemo(() => pageSlice(items, currentPage, pageSize), [items, currentPage, pageSize]);

  return {
    pageItems,
    pageInfo: localPageInfo(items.length, currentPage, lastPage),
    firstItemIndex: (currentPage - 1) * pageSize,
    setPage,
  };
};
