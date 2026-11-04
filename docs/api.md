# API layer (`src/api/`)

Data flows from `clients` through `mappers` and `services` to hooks and components. List services take a `contentFilter` argument (`{ hideEcchi }`) instead of reading preferences themselves.

## Clients

- `anilistClient.js` exports `anilistQuery(query, variables, { cache, background, keepForMs })`, the single way to call AniList:
  - Requests go through a rate-limited queue: a burst of 20, 4 at a time, at a rate that follows `X-RateLimit-*`, with a pause until the reset after a 429.
  - Identical queries are cached for the session.
  - `keepForMs` also saves the response to disk. Within that time it's reused with no request. After that, the old copy is still the fallback if a request fails or returns errors. A fallback isn't kept in the session cache, so a retry asks again. Session copies expire after `keepForMs` too.
  - Lifetimes are set by `ANILIST_KEEP_FOR_MS` in `config/api.config.js`. `cache: false` skips both caches, and responses with errors are never saved.
  - `background: true`, used by offline sync and by tracking through `refreshSeries`, runs after anything the user is waiting on and leaves 12 tokens unused. `waitForAniListBackgroundTurn()` waits for the same turn without making a request.
- `jikanClient.js` exports `jikanGet(path)` for MyAnimeList episode names.
- `desktopClient.js` wraps every `window.shiori` call and exports `hasDesktopBridge()`. See [ipc.md](ipc.md) for the channels.
- `queries/anilistQueries.js` holds all AniList GraphQL query strings.

## Mappers

- `mediaMapper.js` exports `mapMedia`, which converts an AniList Media to a `series` (see [series-shape.md](series-shape.md)), and `parseStreamingEpisodes`.
- `listMapper.js` converts AniList and MyAnimeList list statuses to app statuses and exports `uniqueEntries`.
- `nyaaMapper.js` exports `parseNyaaRss`.
- `animeHeavenMapper.js` parses AnimeHeaven search results, episode lists and download URLs from HTML.

## Services

- `animeService.js` loads AniList lists: airing trending, home lists, browse, trending, season, continuing, top trending, schedule, recommendations, suggestions and random series.
- `seriesRegistry.js` is the session cache of series and exports `getCachedSeries`, `loadSeries(ids)`, `fetchSeries`, `refreshSeries`, `fetchSeriesByMalIds` and `rememberMedia`:
  - `rememberMedia` is for lists, which may come from disk. It never replaces a copy with one that has fewer episodes, and leaves out copies made while offline or whose next episode has already aired, so opening the show asks again.
  - `loadSeries` uses a recent saved copy first when online (`isSavedSeriesFresh`), and falls back to saved offline copies when a request fails.
- `seasonService.js` works out prequel chain offsets and exports `fetchSeasonContext` (see [episode-numbering.md](episode-numbering.md)). `fetchEpisodeOffset` falls back to the saved offset and then to 0, while `fetchKnownEpisodeOffset` returns nothing instead of guessing 0.
- `episodeService.js` exports `fetchEpisodeTitles`, which uses Jikan and falls back to saved names, and `requestEpisodeTitles`, which throws on failure.
- `franchiseService.js` exports `fetchWatchOrder`, which returns related seasons, films and OVAs in order.
- `skipService.js` exports `fetchSkipTimes`, which uses AniSkip and falls back to saved times, and `requestSkipTimes`, which throws on failure.
- `importService.js` reads public lists for import: AniList through GraphQL and MyAnimeList through `fetchText`.
- `listExportService.js` exports `buildMalExport`, which converts My List to MyAnimeList XML.
- `animeHeavenService.js` searches shows, finds the show for a series, lists episodes and resolves the direct download URL.
- `subsPleaseService.js` handles the SubsPlease show list and search, and exports `findSubsPleaseShow`, `loadShow`, `alignReleases`, `episodeRelease` and `releaseMagnet`.
- `torrentService.js` handles Nyaa queries and search, and exports `findEpisodeTorrent`, `matchesPreferences`, `isDualAudio` and `openMagnetInTorrentApp`.
- `trackingService.js` exports `checkTrackedShow`, which finds new episodes for a tracked show and either queues them (AnimeHeaven) or hands magnets to the torrent client.
- `offlineStore.js` keeps saved shows and skip times in memory, and exports `loadOfflineStore`, `findOfflineCopy`, the `findSaved…` lookups, `saveSeriesOffline`, `refreshSavedSeries`, `removeSeriesOffline`, `saveSkipTimesOffline` and `markSeriesWithLocalFiles`.
- `offlineSyncService.js` exports `requestOfflineSync(inputs)`, which prunes and refreshes saved shows and saves names, offsets and skip times (see [offline.md](offline.md)).
- `cacheService.js` exports `fetchCacheUsage`, `clearSubtitles` and `clearSavedAniListData`. The last one clears the files, then every in-memory AniList, Jikan and AniSkip cache through the `forget…` exports and `resetOfflineStore`, which triggers a new sync.
- `watchedCleanupService.js` exports `findWatchedEpisodesToClean`, which loads shows with episodes old enough to clean, matches their files and adds file sizes. A show whose offset can't be confirmed is left out and counted in `skippedShows`.
- `userDataStore.js` handles user data loading, migration, saves, and backup snapshots and restores (see [persistence.md](persistence.md)).
