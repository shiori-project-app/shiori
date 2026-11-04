# Shiori

Shiori is a desktop anime app for Windows and Linux. It tracks what you watch, plays episodes from your own download folder, and finds new episodes to download. It is built with Electron 45, React 19 and React Router 8, and uses Vite+ (`vp`) for building, formatting, linting and testing.

Series data comes live from AniList (GraphQL), with Jikan for extra episode names and AniSkip for intro and ending times. Episodes come from AnimeHeaven (direct downloads) and from SubsPlease and Nyaa (torrents handed to the user's torrent client).

## Getting started

You need Node.js and npm.

```bash
npm install
npm run dev
```

`npm run dev` starts the Vite dev server on `127.0.0.1:5173` and opens Electron against it.

## Commands

- `npm run dev` runs the app with hot reload.
- `npm start` builds the page and runs Electron on the result.
- `npm run build` builds the page into `dist/`.
- `npx vp check` checks formatting and lint rules. Add `--fix` to apply formatting.
- `npx vp test run` runs all tests. Pass a file path to run one file, `-t "name"` to filter by test name, or `--project electron` to run only the main-process tests.
- `npm run dist` builds the Windows installer and its update files into `release/`. See [releasing.md](releasing.md) for publishing them. Close any running copy of Shiori first, because a locked `release/win-unpacked` makes the build fail.
- `npm run dist:linux` builds the Linux packages. It has to run on Linux; see [linux.md](linux.md).

## How the app is organized

The app has two processes:

- The **main process** (`electron/`) owns everything the page can't do itself: settings, the download queue, library scans, handing torrents to the torrent client, file dialogs and video streaming.
- The **page** (`src/`) is the React app. It reaches the main process only through `src/api/clients/desktopClient.js`, which wraps the `window.shiori` bridge from `electron/preload.cjs`.

Plain ES modules used by both processes live in `shared/`. Inside the page, data flows from `api/clients` through `api/mappers` and `api/services` to hooks and then components.

## Project rules

- Torrents are always handed to the user's torrent client (qBittorrent or the system magnet handler). Shiori never downloads torrent content itself.
- There are no logins or accounts. AniList and MyAnimeList imports are one-way, from public lists.
- Shiori doesn't include Cloudflare, DRM or encryption bypasses.

## Code conventions

- Write no comments in JS, JSX or SCSS. Names should explain what code does, so extract a well-named function instead of adding a comment, and avoid abbreviations such as `res` or `fn`.
- Use arrow functions everywhere. The one exception is `ErrorBoundary`, because React error boundaries must be classes.
- Prefer `map`, `filter`, `reduce` and `some` over loops. For sequential async work, use `mapSequentially` or `findSequentially` from `utils/async.js`.
- Separate functions, hooks, conditions, loops, returns and multi-line statements with blank lines.
- A ternary is only `condition ? a : b`; lint rejects nested ones. When several branches compare one value, use an object lookup.
- Put stateful logic in hooks (`src/hooks/`) and pure logic in `src/utils/` or `src/api/services/`, and split large components.
- Wrap modals and repeated list items in `memo`, and give them stable `useCallback` props.
- Take colours, shadows, radii, font weights and font sizes from `styles/abstracts/` or the theme's custom properties. `tests/styles/designTokens.test.js` fails on literal values elsewhere.
- Put tests in `tests/`, mirroring the source tree and importing through the `@/` and `@shared/` aliases.
- When you add, rename or remove a hook, util, component, service, context, IPC channel or stored key, update its line in these docs in the same change.

## Reference

Each file below is a short reference. Open the one you need, then follow it to the source.

- [code-map.md](code-map.md) explains where each folder and module lives.
- [series-shape.md](series-shape.md) lists the fields of the `series` object.
- [ipc.md](ipc.md) lists the IPC channels between the page and the main process.
- [persistence.md](persistence.md) covers where user data is saved, migration and backups.
- [episode-numbering.md](episode-numbering.md) explains how releases and files are matched to season episodes.
- [offline.md](offline.md) covers offline mode, saved shows and fallbacks.
- [performance.md](performance.md) covers known performance issues and the decisions behind the current design.
- [linux.md](linux.md) covers building and running on Linux.
- [releasing.md](releasing.md) covers publishing a release and how auto-update works.
- [api.md](api.md) covers API clients, mappers and services.
- [contexts.md](contexts.md) lists the React contexts.
- [main-process.md](main-process.md) covers `electron/` and `shared/`.
- Hooks: [data](hooks/data.md), [downloads](hooks/downloads.md), [player](hooks/player.md), [UI](hooks/ui.md).
- Utils: [series](utils/series.md), [library](utils/library.md), [general](utils/general.md).
- Components: [common](components/common.md), [anime](components/anime.md), [downloads](components/downloads.md), [home and layout](components/home-and-layout.md), [player and watch](components/player-and-watch.md), [series and library](components/series-and-library.md), [settings](components/settings.md), [pages](components/pages.md).
