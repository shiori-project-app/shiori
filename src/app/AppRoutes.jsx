import { lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { OnlineOnly } from '@/components/common/OfflineNotice';
import { AppLayout } from '@/components/layout/AppLayout';
import { ROUTES } from '@/constants/routes';
import { BrowsePage } from '@/pages/BrowsePage';
import { HistoryPage } from '@/pages/HistoryPage';
import { HomePage } from '@/pages/HomePage';
import { MyListPage } from '@/pages/MyListPage';
import { ResultsPage } from '@/pages/ResultsPage';
import { SeriesPage } from '@/pages/SeriesPage';
import { TrendingPage } from '@/pages/TrendingPage';

const lazyNamedPage = (loadPageModule, exportName) =>
  lazy(async () => ({ default: (await loadPageModule())[exportName] }));

const DownloadsPage = lazyNamedPage(() => import('@/pages/DownloadsPage'), 'DownloadsPage');
const SeasonalPage = lazyNamedPage(() => import('@/pages/SeasonalPage'), 'SeasonalPage');
const SettingsPage = lazyNamedPage(() => import('@/pages/SettingsPage'), 'SettingsPage');
const WatchPage = lazyNamedPage(() => import('@/pages/WatchPage'), 'WatchPage');

const onlineOnly = (description, page) => <OnlineOnly description={description}>{page}</OnlineOnly>;

export const AppRoutes = () => (
  <Routes>
    <Route element={<AppLayout />}>
      <Route index element={<HomePage />} />
      <Route path={ROUTES.browse} element={onlineOnly('Browsing needs a connection to AniList.', <BrowsePage />)} />
      <Route path={ROUTES.trending} element={onlineOnly('Trending needs a connection to AniList.', <TrendingPage />)} />

      <Route
        path={ROUTES.seasonal}
        element={onlineOnly('The seasonal chart needs a connection to AniList.', <SeasonalPage />)}
      />

      <Route path={ROUTES.myList} element={<MyListPage />} />
      <Route path={ROUTES.history} element={<HistoryPage />} />
      <Route path={ROUTES.downloads} element={<DownloadsPage />} />
      <Route path={ROUTES.settings} element={<SettingsPage />} />
      <Route path={ROUTES.results} element={onlineOnly('Search needs a connection to AniList.', <ResultsPage />)} />
      <Route path={ROUTES.series} element={<SeriesPage />} />
      <Route path={ROUTES.watch} element={<WatchPage />} />
      <Route path="*" element={<Navigate to={ROUTES.home} replace />} />
    </Route>
  </Routes>
);
