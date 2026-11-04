import { getCachedSeries, loadSeries } from '@/api/services/seriesRegistry';
import { MY_LIST_PAGE_SIZE } from '@/config/app.config';
import { LIST_STATUSES } from '@/constants/listStatuses';
import { useAsync } from '@/hooks/useAsync';
import { useLibrary } from '@/hooks/useLibrary';
import { usePagedList } from '@/hooks/usePagedList';
import { useSearchParam } from '@/hooks/useSearchParam';

const PAGE_RESET_PARAMS = ['page'];

const countByStatus = (list, seriesIds) =>
  Object.fromEntries(
    LIST_STATUSES.map((status) => [
      status.id,
      seriesIds.filter((seriesId) => list[seriesId].status === status.id).length,
    ]),
  );

const firstNonEmptyStatus = (statusCounts) =>
  LIST_STATUSES.find((status) => statusCounts[status.id] > 0)?.id ?? LIST_STATUSES[0].id;

export const useMyListTab = () => {
  const { list } = useLibrary();

  const seriesIds = Object.keys(list).map(Number);
  const statusCounts = countByStatus(list, seriesIds);

  const [requestedStatus, setActiveStatus] = useSearchParam('status', null, { resetParams: PAGE_RESET_PARAMS });

  const activeStatus = requestedStatus ?? firstNonEmptyStatus(statusCounts);

  const seriesIdsInTab = seriesIds
    .filter((seriesId) => list[seriesId].status === activeStatus)
    .sort((first, second) => list[second].addedAt - list[first].addedAt);

  const { pageItems: seriesIdsOnPage, pageInfo, setPage } = usePagedList(seriesIdsInTab, MY_LIST_PAGE_SIZE);

  const seriesOnPage = useAsync(async () => {
    await loadSeries(seriesIdsOnPage);

    return seriesIdsOnPage.map(getCachedSeries).filter(Boolean);
  }, seriesIdsOnPage);

  return {
    isListEmpty: !seriesIds.length,
    statusTabs: LIST_STATUSES.map((status) => ({ ...status, hint: statusCounts[status.id] })),
    activeStatus,
    setActiveStatus,
    seriesOnPage,
    pageInfo,
    setPage,
  };
};
