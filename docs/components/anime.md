# Components: anime (`src/components/anime/`)

These are the series and episode building blocks used across pages.

- `PosterCard` shows a series poster with badges, title and detail. `PosterGrid` lays the cards out.
- `CompactRow` is a small series row with thumbnail, title, tags and rating, used in mini lists, Top Trending and Watch Order.
- `SeriesTags` shows format and year pills.
- `AlternativeTitles` shows the titles not used as the main one, with `lang="ja"` when the native title comes first. `limit` caps how many appear.
- `Section` is a titled section with an optional horizontal rail with arrows and a "more" link.
- `HeroCarousel` shows the Home slides of trending anime using `useCarousel`, paused while hovered, focused or hidden. Each slide has a `Backdrop` and a poster card, with the title clamped to 2 lines and the alternative title to 1.
- `SeasonCard` is the Seasonal chart card: cover, next airing, rating, studio, genres, synopsis and `MyListButton`.
- `FilteredResults` shows a skeleton, an empty state, or a `PosterGrid` with a `Pager` for a page of results.
- `BrowseFilters` holds the Browse page filter selects and genre chips.
- `MyListButton` adds a show to My List, changes its status or removes it, with a toast.
- `WatchOrder` is the franchise watch-order panel with progress:
  - It's always 380 px wide on the right, beside the episodes or alone, and stacks on narrow windows.
  - When collapsed it shows 5 titles (`WATCH_ORDER_PREVIEW`) around the current show, and "View more" shows all of them. The view and expansion reset when the series changes.
  - It skips the fetch when `series.hasWatchOrder === false`, and shows a same-width skeleton while loading so the episode column never reflows.
- `EpisodePanel` lists a series' episodes in blocks of 24, with availability and titles, and scrolls the current episode into view.
- `EpisodeRow` is one row in `EpisodePanel`: thumbnail, status, the downloaded file's resolution, watched badge, show in folder and spoiler blur.
- `EpisodeCard` is an episode card with thumbnail and progress, used on Home and History.
- `EpisodeThumbnail` exports `episodeArtwork`, `WatchedCheck`, `PlayOverlay` and `EpisodeThumbnail`.
- `EpisodeLink` links to the watch page when the episode is ready. Otherwise it's a button that opens the download dialog.
