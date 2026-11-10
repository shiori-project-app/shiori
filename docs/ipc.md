# IPC channels

A new channel needs four pieces: an `ipcMain.handle` in `electron/ipc/*`, its `register…Handlers` call in `main.js`, an entry in `preload.cjs`, and a wrapper in `src/api/clients/desktopClient.js`.

`callDesktop` strips Electron's "Error invoking remote method" prefix from errors. Channels without arguments use `callDesktopWithoutArguments`, which drops anything passed to it. That makes them safe as `onClick` handlers, because a React click event can't cross IPC.

## Channels

Each entry lists the client functions, their channels and the handler file in `electron/ipc/`.

- `fetchText` uses `net:fetch-text` in `network.js`, which enforces a host allow-list.
- `getSettings`, `chooseDownloadDir`, `openDownloadDir`, `updateDownloadSettings`, `updateGraphicsSetting`, `updateBackgroundSettings`, `updateAutoUpdateSetting` and `restartApp` use `settings:get`, `:choose-download-dir`, `:open-download-dir`, `:update-downloads`, `:update-graphics`, `:update-background`, `:update-auto-update` and `:restart` in `settings.js`.
- `showMainWindow` uses `window:show`, registered in `main.js`.
- `loadUserData`, `saveUserData` and `replaceUserData` use `user-data:load`, `:set` and `:replace` in `userData.js`.
- `loadOfflineLibrary`, `saveOfflineSeries`, `removeOfflineSeries` and `saveOfflineSkipTimes` use `offline:load`, `:save-series`, `:remove-series` and `:save-skip-times` in `offline.js`.
- `getTorrentApp` and `openMagnet` use `torrent:app` and `torrent:open` in `torrents.js`.
- `scanLibrary` and `showLibraryFile` use `library:scan` and `library:show` in `library.js`.
- `getSubtitles`, `getVideoResolutions` and `openExternally` use `media:subtitles`, `media:resolutions` and `media:open-external` in `media.js`.
- `saveExport`, `openBackup` and `autoBackup` use `backup:save`, `:open` and `:auto` in `backup.js`.
- `readAniListResponse` and `saveAniListResponse` use `anilist-cache:read` and `:save` in `anilistCache.js`.
- `getCacheUsage`, `clearSubtitleCache` and `clearAniListData` use `caches:usage`, `:clear-subtitles` and `:clear-anilist` in `caches.js`.
- `getDownloadFolderUsage`, `getFileSizes`, `chooseCleanupMoveFolder` and `cleanUpFile` use `cleanup:usage`, `:file-sizes`, `:choose-move-folder` and `:clean-file` in `cleanup.js`.
- `getUpdateState`, `checkForUpdates`, `downloadUpdate` and `installUpdate` use `updates:get-state`, `:check`, `:download` and `:install` in `updates.js`.
- `listDownloads`, `addDownloads`, the per-item actions (pause, resume, cancel, retry, move, remove, show), `pauseAllDownloads`, `resumeAllDownloads` and `clearFinishedDownloads` use the `downloads:*` channels in `downloads.js`. `getDownloadResolutions` uses `downloads:resolutions` there too, and only answers for files of completed jobs.

## Events from the main process

Subscribe with the matching `on…` function in `desktopClient`.

- `system:resume` (`onSystemResume`) makes tracking check again.
- `window:hidden-to-tray` (`onHiddenToTray`) pauses the player.
- `downloads:changed` (`onDownloadsChanged`) sends the whole queue, throttled to every 200 ms.
- `user-data:save-failed` (`onUserDataSaveFailed`) shows a toast.
- `updates:changed` (`onUpdateStateChanged`) sends the app update state.

## Media protocol

Video files and saved covers don't use channels. `media.js` serves them through the `shiori-media://video/<relative path>` and `shiori-media://cover/<id>` protocol.
