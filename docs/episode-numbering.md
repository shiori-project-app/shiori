# Episode numbering

Release groups often number across seasons ("Solo Leveling - 23" is Season 2 episode 11) or across split cours, and AniList titles name seasons inconsistently. Working out which season and episode a release or file belongs to is therefore the subtlest part of the codebase. Change any piece below only with matching tests.

## Pieces

- `utils/titles.js` reads seasons from titles. Tests: `tests/utils/titles.test.js`.
  - `seriesSeason(series)` gets the season from all title variants.
  - `markedSeason(title)` finds an explicit "Season 2", "2nd Season", "S2" or roman numeral.
  - `withoutSeason`, `normalizeTitle` and `looseTitle` clean titles for comparison.
  - `releaseTitleVariants` lists the names release groups use.
- `api/services/seasonService.js` works out season context. `fetchSeasonContext(series)` walks the prequel chain (TV and TV_SHORT, or ONA with 4 or more episodes) and returns:
  - `offset`, the number of episodes in all earlier seasons. `fetchEpisodeOffset` returns only this value.
  - `sameSeasonOffset`, the earlier parts of the same season, for split cours.
  - `firstSeason`.
  - `schedule`, which maps an episode to its airing time in milliseconds.
- `utils/episodeFiles.js` handles local files. Tests: `tests/utils/episodeFiles.test.js`.
  - `parseEpisodeNumber(name)` understands S01E05, EP5, " - 05" and a trailing number, and skips batches and ranges.
  - `matchSeriesFiles(series, files, offset)` maps local files to season episodes by show folder or title match, renumbering files that continue across seasons.
- `utils/releaseEpisodes.js` handles torrent releases. `releaseEpisodes(series, releases, context)` maps them to episodes using these rules. Tests: `tests/utils/releaseEpisodes.test.js`.
  - Titles marked with a season must match that season.
  - Numbers above `offset` are shifted down by it.
  - A ±1 correction is decided by a vote that compares publish times with the airing schedule.
  - Unverified releases must have been published while the season aired.
- `alignReleases` in `api/services/subsPleaseService.js` handles SubsPlease shows: if numbers exceed the season's count, they're shifted so the lowest becomes 1. Tests: `tests/api/services/subsPleaseService.test.js`.
- `episodeQueries` and `seasonQueries` in `api/services/torrentService.js` build Nyaa searches from the title variants and season context.
- `matchLinkedSeriesFiles` in `utils/fileLinks.js` adds the user's own links on top of `matchSeriesFiles`.

## Used by

- `useLocalEpisodes` uses this logic for local files.
- `useNyaaSearch` and `torrentService.findEpisodeTorrent` use it for Nyaa releases. Tracking uses the latter too.
- `subsPleaseService.loadShow` uses it for SubsPlease. `useSubsPleaseShow` and tracking both call it.
