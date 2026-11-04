# Utils: library, storage, downloads

- `library.js` holds immutable updates for library state: `withoutKey`, `withEpisodeWatched`, `withEpisodeUnwatched`, `mergeImportedEntries` (merges a list import and returns a summary), `withNoteAdded`, `withNoteDeleted`, `withWatchDateRecorded` (keeps the first date) and `withWatchDateRemoved`.
- `watchStats.js` exports `watchStats`, which computes episode and show totals, seconds watched from `series.duration`, `topGenres` by show count, and `episodesPerMonth` from `watchDates` in local months.
- `storage.js` wraps `localStorage` under the `shiori:` prefix: `storage.get`, `set`, `remove`, `snapshot` and `replaceAll`, plus `onStorageWriteFailure`.
- `legacyUserData.js` holds first-run migration helpers: `withLegacyListConverted` (converts old `mylist` ids to a list), `userDataByFile`, `storageKeysOwnedByFiles` and `withoutUserDataKeys`.
- `backup.js` exports `createBackup`, `parseBackup` (validates the app and format and keeps plain keys) and `summarizeBackup` (counts for the restore dialog).
- `malExport.js` exports `toMalXml(entries)`, which produces the MyAnimeList XML export.
- `watchedCleanup.js` exports `cleanupCutoff`, `seriesIdsWithDueEpisodes`, `episodesBySeries`, `totalBytes`, `findCleanupCandidates` (only dated, watched, finished files, keeping a file another episode still needs) and `initiallySelectedPaths` (confident matches only).
- `libraryScan.js` exports `isSameScan`, which lets a rescan that found nothing new keep the existing file list.
- `downloads.js` exports `showFolderLabel` and `episodeFileName`, which produces names like `"<title> - 05.mp4"`.
- `downloadStatus.js` builds queue item text: `downloadStatusText`, `downloadPercent` and `queueSummary`.
- `media.js` exports `localVideoUrl(file)`, which builds the `shiori-media://video/...` URL for the player.
- `fileLinks.js` handles files linked by hand, along with helpers for changing links, building locations and searching. `matchLinkedSeriesFiles` applies the automatic match, then linked folders, then linked files, each overriding the last, except that an unfinished file never hides a finished one. A linked folder reads per-season numbers unless they run past the season.
