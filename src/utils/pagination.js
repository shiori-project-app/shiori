import { ANILIST_EXACT_TOTAL_LIMIT } from '@/config/api.config';

const ANILIST_MAX_PAGE = 200;
const NEIGHBOUR_PAGE_COUNT = 2;

export const FIRST_PAGE = 1;

export const lastReachablePage = ({ currentPage, total, lastPage, hasNextPage, isTotalExact = false }) => {
  if (isTotalExact || total < ANILIST_EXACT_TOTAL_LIMIT) return lastPage;

  return hasNextPage ? Math.min(currentPage + 1, ANILIST_MAX_PAGE) : currentPage;
};

export const visiblePageNumbers = (currentPage, lastPage) => {
  const neighbourPages = Array.from(
    { length: NEIGHBOUR_PAGE_COUNT * 2 + 1 },
    (_, offset) => currentPage - NEIGHBOUR_PAGE_COUNT + offset,
  );

  return [...new Set([1, lastPage, ...neighbourPages])]
    .filter((pageNumber) => pageNumber >= 1 && pageNumber <= lastPage)
    .sort((first, second) => first - second);
};

export const pageCount = (itemCount, pageSize) => Math.max(FIRST_PAGE, Math.ceil(itemCount / pageSize));

export const clampPage = (requestedPage, lastPage) => Math.min(Math.max(FIRST_PAGE, requestedPage), lastPage);

export const pageSlice = (items, currentPage, pageSize) =>
  items.slice((currentPage - 1) * pageSize, currentPage * pageSize);

export const localPageInfo = (itemCount, currentPage, lastPage) => ({
  currentPage,
  lastPage,
  total: itemCount,
  hasNextPage: currentPage < lastPage,
  isTotalExact: true,
});
