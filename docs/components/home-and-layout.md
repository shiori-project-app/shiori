# Components: home and layout

## `src/components/home/`

- `HomeLists` shows the Home list tabs as posters, beside `MiniList`s and `TopTrending`.
- `HomeSkeletons` exports `HomeListsSkeleton` and `ScheduleSkeleton`.
- `MiniList` is a short titled list of `CompactRow`s with a "more" link.
- `TopTrending` is the ranked trending list.
- `Schedule` shows the airing schedule for the chosen day, using `useScheduleDay`, and can be expanded.
- `ScheduleDayStrip` is the day picker with previous and next week.
- `ScheduleItem` shows one airing: time, episode and title.

## `src/components/layout/`

- `AppLayout` renders `Header` and the page `<main>`, and scrolls to the top on navigation.
- `Header` holds the logo, `Nav`, `SearchBar`, and the "Surprise me" (random series) and settings buttons.
- `Logo` shows the bookmark mark and name, and links home. It uses fixed brand colours (the `$brand-vermilion` ribbon and `$brand-washi` torii in `abstracts/_variables.scss`), not the theme accent.
- `Nav` holds the main links, with a count badge on Downloads.
- `SearchBar` is the search box with suggestions, using `useSearchSuggestions`.
- `Footer` is the page footer.
- `OfflineBanner` is the sticky "You’re offline" bar at the top of `main`.
- `StartupScreen` is the loading screen, with a spinner after 0.3 s, or a load error with "Try again". `UserDataGate` shows it.
