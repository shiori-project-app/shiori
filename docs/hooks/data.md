# Hooks: data, library, lists

`useLibrary`, `usePreferences`, `useAppearance`, `useSettings`, `useSession`, `useDownloads`, `useTracking` and `useToast` each return their context (see [../contexts.md](../contexts.md)). `usePlaybackProgress` and `useLiveDownloads` return the fast-changing parts, which are kept apart so that few components re-render.

- `useAsync(load, deps)` returns `{ data, error, loading, retry }` and ignores stale responses. `deps` must be JSON-serializable, because they form the request key.
- `usePersistentState(key, initial)` is state saved to `localStorage`, used for preferences.
- `useUserDataState(key, initial)` is state saved to the library and activity files (see [../persistence.md](../persistence.md)).
- `useUserDataLoad()` loads user data once for `UserDataGate`, returns `{ status, error, retry }` and shows load warnings as toasts.
- `usePreferences.js` also exports:
  - `useDisplayTitle()`, which gives a title in the chosen language.
  - `useContentFilter()`, which returns `{ hideEcchi }` for list services.
  - `useSystemReducesMotion()`, which reads the system setting and updates live.
  - `useReducedMotion()`, which is true if either the system setting or Shiori's own setting is on.
  - `useTogglePreference(name)`.
- `useSeries(id)` wraps `fetchSeries` in `useAsync`.
- `useHistoryEntries()` turns history ids into `{ series, episode }` entries, loading any missing series.
- `useResumeEpisode(series)` returns `{ resumeEpisode, hasStarted }`, using history first and then the episode after the furthest watched.
- `useMyListTab()` provides the My List status tab (`?status=`), the count per status and the paged series for the tab.
- `useWatchStats()` powers the Stats tab in My List. It loads every watched series and computes `watchStats`. `stats` is null while loading.
- `useSeasonalChart()` powers the Seasonal page: season, format tab, sort, and paged and filtered series.
- `useScheduleDay()` powers the Home schedule: the selected day, week start, expand toggle and that day's airings.
- `useEpisodeTitles(series, first, last)` returns episode names for a range, from Jikan or AniList.
- `useListImport()` runs an AniList or MyAnimeList list import into My List and reports `importStatus` phases.
- `useCacheActions()` powers Settings → Storage: cache `usage`, `clearingCache` and `clearCache(name)`, with toasts.
- `useWatchedCleanup()` powers cleanup in Settings → Storage. It provides folder `usage`, `phase`, `review`, `selectedPaths`, `outcome`, `findEpisodes`, `toggleCandidate`, `closeReview` and `confirmCleanup`, which marks tracked episodes as handled before touching files and rescans afterwards.
- `useBackupActions()` powers Settings → Backup: export a backup, choose, confirm or cancel a restore, and export MyAnimeList XML.
- `useSearchSuggestions(query)` returns debounced title suggestions for 2 or more characters.
- `useOnlineStatus()` exposes `navigator.onLine` as state.
- `useOfflineSync()` triggers the offline library sync. `app/OfflineSync` mounts it once.
- `useAppUpdate()` returns the app update state (`phase`, `currentVersion`, `availableVersion`, `downloadPercent`), or null until it has loaded, and follows changes from the main process.
- `useShareSeriesLink(id)` copies the AniList URL and shows the result as a toast.

## URL state

- `useSearchParam(name, fallback, { replace, resetParams })` exposes one query parameter as state. Use `resetParams: ['page']` to drop paging when a tab changes.
- `usePageParam()` exposes `?page=` as a number.
- `usePagedList(items, pageSize)` pages a list client-side, bound to `?page=`, and returns `{ pageItems, pageInfo, firstItemIndex, setPage }`.
