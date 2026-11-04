import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { fetchContinuing, fetchSeason } from '@/api/services/animeService';
import { SEASONAL_PAGE_SIZE } from '@/config/app.config';
import { useAsync } from '@/hooks/useAsync';
import { usePagedList } from '@/hooks/usePagedList';
import { useContentFilter, useDisplayTitle } from '@/hooks/usePreferences';
import { compareSeasons, currentSeason, readSeason } from '@/utils/season';
import {
  ALL_FORMATS_TAB,
  CONTINUING_TAB,
  formatTabsWithCounts,
  seriesInFormatTab,
  sortSeasonalSeries,
} from '@/utils/seasonalChart';

export const useSeasonalChart = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedSeason = readSeason(searchParams);
  const thisSeason = currentSeason();
  const isCurrentSeason = compareSeasons(selectedSeason, thisSeason) === 0;

  const canHaveContinuing = compareSeasons(selectedSeason, thisSeason) <= 0;

  const [activeTab, setActiveTab] = useState(ALL_FORMATS_TAB);
  const [sortId, setSortId] = useState('popularity');
  const [hasOpenedContinuing, setHasOpenedContinuing] = useState(false);

  const displayTitle = useDisplayTitle();
  const contentFilter = useContentFilter();

  const seasonSeries = useAsync(
    () => fetchSeason(selectedSeason.season, selectedSeason.year, contentFilter),
    [selectedSeason, contentFilter],
  );

  const shouldLoadContinuing = canHaveContinuing && hasOpenedContinuing;

  const continuingSeries = useAsync(
    () =>
      shouldLoadContinuing
        ? fetchContinuing(selectedSeason.season, selectedSeason.year, contentFilter)
        : Promise.resolve(null),
    [selectedSeason, shouldLoadContinuing, contentFilter],
  );

  const goToSeason = (season) => {
    setActiveTab(ALL_FORMATS_TAB);
    setHasOpenedContinuing(false);
    setSearchParams({ season: season.season, year: String(season.year) });
  };

  const backToFirstPage = () =>
    setSearchParams((previousParams) => {
      const nextParams = new URLSearchParams(previousParams);

      nextParams.delete('page');

      return nextParams;
    });

  const selectTab = (tabId) => {
    setActiveTab(tabId);

    if (tabId === CONTINUING_TAB) setHasOpenedContinuing(true);

    backToFirstPage();
  };

  const selectSort = (nextSortId) => {
    setSortId(nextSortId);
    backToFirstPage();
  };

  const isContinuingTab = activeTab === CONTINUING_TAB;

  const tabs = [
    ...formatTabsWithCounts(seasonSeries.data),
    ...(canHaveContinuing ? [{ id: CONTINUING_TAB, label: 'Continuing', hint: continuingSeries.data?.length }] : []),
  ];

  const visibleSeries = useMemo(() => {
    const seriesList = isContinuingTab
      ? (continuingSeries.data ?? [])
      : seriesInFormatTab(seasonSeries.data ?? [], activeTab);

    return sortSeasonalSeries(seriesList, sortId, displayTitle);
  }, [isContinuingTab, continuingSeries.data, seasonSeries.data, activeTab, sortId, displayTitle]);

  const { pageItems: seriesOnPage, pageInfo, setPage } = usePagedList(visibleSeries, SEASONAL_PAGE_SIZE);

  return {
    selectedSeason,
    thisSeason,
    isCurrentSeason,
    goToSeason,
    tabs,
    activeTab,
    selectTab,
    sortId,
    selectSort,
    seasonSeries,
    continuingSeries,
    isContinuingTab,
    visibleSeries,
    seriesOnPage,
    pageInfo,
    setPage,
    isListLoading: isContinuingTab ? continuingSeries.loading : seasonSeries.loading,
  };
};
