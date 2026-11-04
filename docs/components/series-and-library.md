# Components: series and library

## `src/components/series/`

- `SeriesOverview` shows the cover, titles, synopsis and genre tags, which link to Browse. `SeriesPage` puts it in `.series__hero` over a `Backdrop`.
- `SeriesActions` holds play or resume, `MyListButton`, `DownloadButton`, `TrackButton` and `NextEpisodeNote`.
- `SeriesFacts` lists facts such as rating, studio and year.
- `NextEpisodeNote` shows "Next EP n · time" for airing shows.
- `Recommendations` is the "You May Also Like" rail.

## `src/components/library/`

- `ImportDialog` imports a public AniList or MyAnimeList list into My List, using `useListImport`.
- `WatchStats` is the Stats tab in My List, using `useWatchStats`: tiles for hours, episodes and shows, top genre bars and an episodes-per-month chart.
