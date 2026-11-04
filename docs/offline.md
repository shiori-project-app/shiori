# Offline mode

## What gets saved

- A show is saved if it's in My List, History, tracking or the download queue, has files linked by hand (`fileLinks`), or matches files in the download folder (`useLocalEpisodes` marks these).
- Each saved show stores the full `series`, the episode offset, episode names (from Jikan, up to `episodeTitlesUpTo`), the cover image, `savedAt` (the last full sync) and `seriesFetchedAt` (the last time the show came from AniList).
- AniSkip times are saved for every downloaded episode, keyed `"<malId>:<episode>"`. An empty array means none exist.
- Data is stored in `<userData>/offline/series.json`, which uses the same versioned format with a `.bak` copy as user data. Covers are stored in `offline/covers/<id>.<ext>` and served as `shiori-media://cover/<id>` (`ipc/offline.js`, `ipc/media.js`).

## Sync (`useOfflineSync` calling `offlineSyncService.requestOfflineSync`)

The sync runs 5 s after its inputs change, only while online and after the first library scan. Only one run happens at a time, and a newer request waits. Each run does the following:

- It removes saved shows that are no longer kept.
- It refreshes kept shows that are missing or older than 24 h (`refreshSeries`), then their offset and episode names, pausing 1.2 s between Jikan calls. A show whose offset lookup fails with nothing saved is skipped that round, so a failure never stores a wrong offset of 0.
- It fetches skip times for downloaded episodes that have none, 0.3 s apart.

Settings → Storage can clear the whole offline library (`cacheService.clearSavedAniListData`), after which `resetOfflineStore` triggers a new sync. Pure decisions live in `utils/offlineLibrary.js`. Any series fetched by id also refreshes its saved copy (`refreshSavedSeries`).

## Saved copies while online

While online, `loadSeries` uses a saved show without making a request if it's fresh (`isSavedSeriesFresh`). A copy stays fresh for 7 days for finished shows and 6 hours for others, counted from `seriesFetchedAt`. It stops being fresh once `nextAiringAt` has passed, so a new episode appears right away. While offline, this check is skipped so that covers come from the saved files.

## Fallbacks when a request fails

- `seriesRegistry.loadSeries` and `fetchSeries` fall back to `findOfflineCopy`, which points the cover at the saved file and sets `banner: null` and `isOfflineCopy: true`. They throw only if none of the missing shows was saved. Live copies always win.
- `fetchEpisodeTitles` merges saved names under the fetched ones, `fetchEpisodeOffset` falls back to the saved offset, and `fetchSkipTimes` falls back to the saved times.
- The strict variants `requestEpisodeTitles` and `requestSkipTimes` throw instead. The sync uses them.

## UI

- `useOnlineStatus()` follows `navigator.onLine`. `OfflineBanner` sits at the top of `main`.
- `OnlineOnly` wraps Browse, Trending, Seasonal and search results in `AppRoutes`. Home renders `OfflineHome`, which shows Continue Watching and a notice. `LoadError` says "You’re offline" when offline.

## Testing offline in the real app

`session.enableNetworkEmulation({ offline: true })` doesn't cut the network. Use the DevTools protocol instead: call `webContents.debugger.attach('1.3')` and `Network.enable`, then `Network.emulateNetworkConditions({ offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 })`. Reload while offline to drop in-memory caches.
