# Main process (`electron/`) and `shared/`

## `electron/`

- `main.js` allows one running copy per `userData` folder, so a second launch focuses the first window. It creates the window, keeps it on the app page by blocking dropped files and other navigations, sends external links to the browser, registers all IPC handlers and forwards system resume.
- `preload.cjs` exposes `window.shiori` and must stay CommonJS.
- `tray.js` manages the tray icon while `keepRunningInTray` is on, and exports `showMainWindow`:
  - Closing the window hides it instead, but only if the icon really exists. On a Linux desktop with no tray area no icon is created, so closing the window quits.
  - The app quits properly at Windows shutdown so that saves still happen.
  - `--start-in-tray`, used by the login item, opens the app with no window.
- `loginItem.js` exports `canOpenAtLogin`, `opensAtLogin`, `setOpensAtLogin` and `refreshLoginItem`. It uses Electron's login item on Windows (`electron.app.Shiori` in the Run key, which the uninstaller removes) and an autostart `.desktop` file on Linux. It only acts in the installed app.
- `linuxDesktop.js` exports `isLinux`, `desktopHasTray`, `environmentOutsideApp` (for programs Shiori starts), `desktopEntryProgramLines` and `startAgainAfterExit`. See [linux.md](linux.md).
- `appIcon.js` exports `APP_ICON_FILE`, the path of the icon used by the window, tray and launcher entry.
- `linuxLauncherEntry.js` exports `refreshLauncherEntry`, which gives the AppImage and tar.gz a launcher entry and icon. See [linux.md](linux.md).
- `contextMenu.js` builds the right-click menu. `contextMenuTemplate(params, webContents)` offers spelling fixes and editing in text boxes, copy, link and image actions on page content, and Back and Forward everywhere else.
- `windowMessages.js` exports `sendToAllWindows(channel, ...payload)`, which sends an event to every open window.
- `webUrls.js` exports `isWebUrl`, which ensures only `http(s)` addresses open in the browser.
- `fileSystem.js` exports `folderUsage` (recursive bytes and files) and `writeFileAtomically` / `writeFileAtomicallyAsync`. Use the atomic writers for every JSON state file. They write a temporary file and rename it, briefly retry a locked target, and remove the temporary file on failure.
- `logger.js` exports `logInfo` and `logError`, which write to `<userData>/logs/main.log` (rotated at 1 MB). It also logs unhandled errors.
- `mkvSubtitleReader.js` exports `readMkvSubtitleTracks(path, { windowBytes })`, which reads text subtitle tracks from an MKV (ASS, SSA and UTF-8, with zlib or header-stripping compression) and skips non-subtitle data. A damaged line is skipped, and a damaged file returns what was read so far.
- `videoResolutionReader.js` exports `readVideoResolution(path)`, which returns the displayed `{ width, height }` from an MP4, MOV, MKV or WebM file's headers, using the largest video track, without reading the video data. For an MKV that's its display size when given in pixels, its stored height widened to the display aspect ratio when given as a ratio, and otherwise its stored size. An MP4's disabled tracks, such as cover art, count only if no track is enabled. Anything else, including AVI, a file with no video track and an MKV with no tracks before its first cluster, returns `null`.
- `ebml.js` holds the Matroska element parsing, IDs and size limits shared by the two readers above.
- `videoResolutions.js` exports `videoResolutionsOf(fileKeys, videoPathOf)`, which answers each key with its file's resolution or `null`. It checks at most two files at a time, so a slow or unreachable drive can't tie up the main process's file threads. It keeps one entry per path, with the read in progress or its result, until the file's size or modified time changes. A file it can't find is a quiet `null`. A file it can't read is logged once and tried again after a minute.
- `showFolderMigration.js` renames show folders ending in a dot or space at startup on Windows, because Windows can't open them. It merges folders without overwriting, and `savePathAfterMoves` keeps queued jobs pointing at their files.
- `userDataFile.js` manages one versioned user data file: loading with a `.bak` fallback, batched saves, confirmed replacement and flushing. See [persistence.md](persistence.md).

### `electron/ipc/`

- `settings.js` manages `settings.json` and exports `getSettings`, `onSettingsChanged` and `applyGraphicsSettingAtLaunch`, which adds `disable-gpu-compositing` before the app is ready when `smoothGraphics` is on. It also handles restarts. The default download folder is `<userData>/Downloads`, or `~/Videos/Shiori` on Linux. If no folder was ever saved and the old default `Downloads\Shiori` exists, that folder is kept and written to `settings.json`.
- `userData.js` handles `library.json` and `activity.json`, and flushes them on quit.
- `offline.js` handles saved shows, skip times and covers for offline use (`offline/series.json`, `offline/covers/`), and exports `serveCover` for `shiori-media://cover/<id>`.
- `network.js` handles `net:fetch-text` for sites that block cross-origin requests, limited to a host allow-list. Add a host there before fetching a new site from the page.
- `downloads.js` handles the download queue and saves it on quit.
- `library.js` scans the download folder and reveals files in the system file manager. A folder that can't be read returns `isUnreachable: true` rather than an empty list, except for the app's own default folder, which may simply not exist yet.
- `media.js` streams video and saved covers through `shiori-media://` with byte ranges, extracts and caches MKV subtitles, and opens video files in the default player. It refuses to open anything else.
- `torrents.js` finds qBittorrent, using install folders on Windows and `PATH` and Flatpak on Linux, and hands it magnets. If it isn't found, the system magnet handler is used.
- `anilistCache.js` saves AniList responses, one file per request in `<userData>/anilist-cache/`, named by a hash of the query and variables. A damaged file counts as nothing saved. At startup it removes files over 14 days old and keeps at most 600 files and 100 MB.
- `caches.js` reports cache sizes and clears them: the subtitle cache (`media.js`), the offline library (`clearOfflineLibrary` in `offline.js`, which also drops the `.bak`), and saved AniList responses (`anilistCache.js`) together with Chromium's HTTP image cache.
- `cleanup.js` handles watched-episode cleanup:
  - It reports download folder usage, free space and file sizes.
  - It manages the move folder (`cleanupMoveFolder`), which is set only through its native dialog and can never be inside the download folder.
  - `cleanUpFile` sends one finished video file to the Recycle Bin (Trash on Linux) or the move folder. It refuses paths outside the download folder, non-video files and files still queued.
  - Moves never overwrite. Across drives, a move copies the file, checks its size, then removes the original.
- `updates.js` runs auto-update with `electron-updater`: a check on every launch, repeat and manual checks, downloading, installing, and sending the current state to the page. See [releasing.md](releasing.md).
- `backup.js` shows the save and open dialogs for backups and exports, and makes an automatic backup before a restore, keeping 10.
- `paths.js` exports `downloadsRoot`, `resolveDownloadPath` (which keeps paths inside the download folder) and `showFolder`.

### `electron/downloads/`

- `queueStore.js` holds the job list and `downloads.json`, broadcasts changes every 200 ms and saves every 2 s.
- `downloadRunner.js` runs jobs with HTTP Range resume, a parallel limit, `STALL_TIMEOUT_MS` and short-download detection, and keeps the `.part` file for retries:
  - It resumes only `.part` files the job recorded (`total` above 0), sends `If-Range`, and discards the file if `Content-Range` doesn't match.
  - A job's next transfer waits until its previous one has closed the `.part` file (`waitForTransferToStop`), because two writers corrupt it.
  - A final size check fails the download if the file doesn't match.
  - On a 416, it finishes if the `.part` is already complete. Otherwise it drops the `.part` so that Retry starts over.
- `speedLimiter.js` exports `waitForBandwidth`, which applies the speed limit.

## `shared/`

- `userDataFiles.js` holds the user data format version, the key-to-file map and the expected shapes (`damagedUserDataKeys`, `withDamagedUserDataRemoved`).
- `downloadLimits.js` holds the parallel download and speed limit options and exports `validDownloadSettings`.
- `byteRange.js` exports `parseByteRange` for `Range` headers.
- `subtitles.js` exports `buildAss`, `buildCues` and `formatAssTime`.
- `downloadStates.js` exports `isActive`, `isPending` and `isRetryable`, which tell either process what state a download is in.
- `fileNames.js` exports `withoutUnsafeNameEnding` and `safeName`, which makes names valid on Windows on every platform: no forbidden characters, never only dots, no trailing dots or spaces, and at most `MAX_NAME_LENGTH`.
- `videoFiles.js` exports `VIDEO_EXTENSIONS` and `isVideoFileName`.
- `platformNames.js` exports `trashNameOn(platform)`, which returns Recycle Bin or Trash.
- `updatePhases.js` exports `UPDATE_PHASES`, the states of an app update.
