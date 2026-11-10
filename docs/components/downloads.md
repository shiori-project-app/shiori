# Components: downloads (`src/components/downloads/`)

- `DownloadButton` opens `DownloadDialog` for one episode or the whole season.
- `PanelSearchForm` is the labelled search box and button shared by the download panels.
- `LinkFilesButton` opens `LinkFilesDialog`, which links any file to an episode or a folder to a show when matching didn't recognise them. A folder covers only the files directly inside it. Only files in the download folder can be linked, because playback is limited to it.
- `DownloadDialog` has one tab per source: AnimeHeaven, SubsPlease and Nyaa.
- `AnimeHeavenPanel` picks an episode range and queues direct downloads, using `useAnimeHeavenQueue`.
- `AnimeHeavenShowPicker` chooses or searches for the matching AnimeHeaven show.
- `SubsPleasePanel` lists SubsPlease releases for the episode or season and sends them to the torrent client.
- `SubsPleaseShowPicker` chooses or searches for the SubsPlease show.
- `NyaaPanel` shows Nyaa search results with filters, using `useNyaaSearch`.
- `TorrentRow` shows one torrent: title, details, and open and copy-magnet buttons.
- `TorrentAppHint` tells the user qBittorrent wasn't found.
- `ChoiceChips` is a chip-style single choice, used for resolution and audio.
- `DownloadQueue` is the paged queue on the Downloads page, with progress, the resolution of finished files (read live through `useVideoResolutions`), per-item actions, pause and resume all, and clear finished.
- `DownloadFolderBar` shows the current download folder with change and open buttons.
- `TrackButton` opens `TrackDialog`.
- `TrackDialog` sets up automatic downloads: source, quality and starting episode, using `useTrackForm`.
- `TrackingList` shows tracked shows, paged, with the last result, an edit button (`TrackDialog`) and check now.
