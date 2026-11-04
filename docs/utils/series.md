# Utils: series, episodes, seasons

For how numbering works, see [../episode-numbering.md](../episode-numbering.md).

- `titles.js` exports `displayTitle` and `otherTitles` (by title language), `normalizeTitle`, `looseTitle`, `straightQuotes`, `withoutSeason`, `markedSeason`, `seasonNumber`, `seriesTitles`, `seriesSeason` and `releaseTitleVariants`.
- `episodeFiles.js` exports `parseEpisodeNumber(name)`, `matchSeriesFiles(series, files, offset)`, and the stricter checks cleanup uses, `isInSeriesFolder` and `namesSeriesExactly`, because a name that merely contains the title can belong to another show.
- `releaseEpisodes.js` exports `releaseEpisodes`, which maps torrent releases to season episodes.
- `episodes.js` exports `episodeId` and `parseEpisodeId` (`"<id>-<n>"`), `buildEpisode`, the helpers for episode blocks of 24 (`blockOf`, `blockCount`, `blockRange`), and `episodeNumbersInRange`.
- `series.js` builds display text: `formatLabel`, `isUpcoming`, `hasAired`, `episodeCountText`, `releasedEpisodesText`, `premiereText`, `nextAiringTime`, `airingStatusText`, `episodeAge` ("This week", "2 wk ago"), `statusBadge`, `seriesYearTag` and `seriesDetail`.
- `season.js` exports `SEASONS`, `currentSeason`, `shiftSeason`, `seasonLabel`, `seasonStartDate`, `compareSeasons` and `readSeason`, which reads a season from URL parameters.
- `seasonalChart.js` provides the Seasonal page format tabs with counts, the "continuing" tab, sort options and `sortSeasonalSeries`.
- `schedule.js` provides local midnight and unix-second helpers, `firstDayOfWeek`, and airing time and weekday and date labels.
- `watched.js` exports `isWatched`, `watchedCount`, `furthestWatchedEpisode`, `firstEpisodes(n)` and `mergeEpisodes` (a sorted union).
- `watchOrder.js` handles franchise relations and labels:
  - `orderFranchise` reads prequel, sequel and parent links from either end, because AniList often records only one side.
  - `seriesWatchProgress` works per entry in the watch order, and counts an entry as completed only against a known episode total.
  - `collapsedWindow` picks which 5 titles to show, keeping the current one and the next visible.
- `skipTimes.js` exports `SKIP_TYPES`, `fitSkipTimes` (clamps AniSkip times to the video length), `segmentAt(time)` and `reachedByPlaying`, which is true when playback crossed a segment start, so auto-skip may fire.
- `subsPleaseReleases.js` exports `subsPleaseResolution`, `releasesForEpisode` and `releasesForSeason` (batches first).
- `offlineLibrary.js` decides which shows to keep offline: `seriesIdsToKeep`, `savedIdsToRemove`, `idsNeedingRefresh`, `needsEpisodeTitles`, `episodesNeedingSkipTimes`, `downloadedEpisodes`, `skipTimesKey` and `isSavedSeriesFresh`.
- `trackingSchedule.js` exports `nextCheckDelay(tracked, now)` (when to check tracked shows again), `withCheckResult(entry, result)` and `withEpisodesHandled(entry, episodes)`.
