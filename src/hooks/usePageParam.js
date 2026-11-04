import { useSearchParam } from '@/hooks/useSearchParam';
import { FIRST_PAGE } from '@/utils/pagination';

export const usePageParam = () => {
  const [pageText, setPage] = useSearchParam('page', String(FIRST_PAGE));

  return [Number(pageText) || FIRST_PAGE, setPage];
};
