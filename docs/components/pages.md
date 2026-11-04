# Pages (`src/pages/`)

Routes are defined in `constants/routes.js` and `app/AppRoutes.jsx`. Watch, Settings, Downloads and Seasonal load with `React.lazy`, with `Suspense` in `AppLayout`. Every page is wrapped in an `ErrorBoundary`, and Browse, Results, Trending and Seasonal also in `OnlineOnly`.

- `HomePage` (`/`) shows the hero carousel, Continue Watching, Latest Episodes, the schedule and home lists. Offline, it shows Continue Watching and a notice.
- `BrowsePage` (`/browse`) combines `BrowseFilters` and `FilteredResults`, keeping filters in the URL.
- `ResultsPage` (`/results?q=`) shows search results.
- `TrendingPage` (`/trending`) shows trending shows, paged by AniList.
- `SeasonalPage` (`/seasonal`) shows the season chart, using `useSeasonalChart`.
- `MyListPage` (`/my-list`) shows status tabs (`useMyListTab`), a Stats tab (`?status=stats`, `WatchStats`) and `ImportDialog`.
- `HistoryPage` (`/history`) shows recently opened episodes, paged, using `useHistoryEntries`.
- `DownloadsPage` (`/downloads`) has two tabs: the queue (`DownloadQueue`) and tracking (`TrackingList`).
- `SettingsPage` (`/settings`) shows the settings tabs.
- `SeriesPage` (`/anime/:id`) shows the overview, actions, episodes, watch order and recommendations.
- `WatchPage` (`/watch/:id/:ep`) shows the player or `EpisodeUnavailable`, `WatchActions`, notes and an episodes sidebar.
- `NotFound` handles an unknown route or series.
