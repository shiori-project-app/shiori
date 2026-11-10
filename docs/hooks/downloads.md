# Hooks: episodes, downloads, torrents, tracking

- `useLocalEpisodes(series)` returns a `Map` from episode to local file, using the library scan and the prequel offset. It includes files the user linked (`fileLinks`), and marks the show for offline saving when files match.
- `useEpisodeAvailability(series)` returns a function `(episodeNumber) => { state, file }`, where `state` is `ready`, `downloading` or `missing`.
- `useVideoResolutions(filePaths, source)` returns an object from file path to `{ width, height }` or `null`. `source` is `libraryFiles` (paths relative to the download folder, the default) or `finishedDownloads` (save paths of completed jobs). It keeps its last results while a new read runs and keeps the same object when nothing changed. It reads again after each library rescan, which is throttled, so a file that finishes or changes gets its label.
- `useAnimeHeavenShow(series)` finds the AnimeHeaven show automatically or by manual search, lets the user pick one, and loads its episodes.
- `useAnimeHeavenQueue(series)` queues AnimeHeaven episodes for direct download and reports progress and status messages.
- `useSubsPleaseShow(series, { initialShow, enabled })` finds or picks the SubsPlease show and its aligned releases, and supports manual show search.
- `useNyaaSearch(series, episode)` searches Nyaa with automatic queries from the season context or a manual query, with a trusted-only filter and torrent preferences.
- `useTorrentPreferences()` provides the saved default resolution and audio from `localStorage`.
- `useTorrentHandoff(series)` provides `copyMagnet` and `openMagnet`, which sends a magnet to qBittorrent or the system magnet handler and shows toasts.
- `useTrackForm(series)` holds the Track dialog state: source, resolution, audio, starting episode, show pickers, and save and untrack actions.
