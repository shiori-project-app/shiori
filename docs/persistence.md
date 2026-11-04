# Persistence

## Where things are saved

- `<userData>/data/library.json`, through `useUserDataState`, holds My List, watched episodes, notes, tracked shows and two structures worth knowing:
  - `watchDates` maps an episode id to a time in milliseconds. It's set when an episode is marked watched and removed when it's unmarked. Imported episodes have no date.
  - `fileLinks` maps a series id to `{ folders, episodes }`. It stores full paths, so a link stops applying if the download folder changes.
- `<userData>/data/activity.json`, through `useUserDataState`, holds history and resume progress.
- `localStorage` under `shiori:*`, through `usePersistentState`, holds the theme, display, player and torrent preferences, and autoplay.
- `<userData>/settings.json`, through `SettingsContext`, holds the download folder (`<userData>/Downloads` by default), parallel downloads, the speed limit, smooth graphics, the cleanup move folder and keep running in the tray.
- `<userData>/downloads.json`, through `DownloadsContext`, holds the download queue.
- `<userData>/offline/` holds saved shows, covers and skip times for offline use. It's a cache and isn't backed up; see [offline.md](offline.md).
- `<userData>/anilist-cache/` holds saved AniList responses. It's a cache and isn't backed up; see [api.md](api.md).

`shared/userDataFiles.js` maps each key to its file. To add a user-data key, add it there and read it with `useUserDataState(key, initial)`.

## Data files (`electron/userDataFile.js`)

- Files use the format `{ format, savedAt, data }`. A `format` above `USER_DATA_FORMAT_VERSION` blocks startup, so a newer file is never overwritten by an older app.
- Saves are batched: the first change starts a 1 s timer, and pending saves are flushed on `before-quit`. A failed save is reported once and retried every 5 s until it succeeds.
- Every write copies the current file to `.bak`, then writes atomically.
- If a file is damaged on load, the `.bak` copy is used and the damaged file is renamed `.unreadable-<time>`. If both are bad, the app starts empty and keeps the damaged file.

## Page side (`src/api/services/userDataStore.js`)

- `UserDataGate` calls `loadUserData()` once and shows `StartupScreen` until it resolves.
- On first run, when the file is `missing` or `unreadable`, the old `localStorage` keys are copied into the file. They're removed only after the write has been read back and matches. `utils/legacyUserData.js` handles this, and also converts the old `mylist` id array.
- Without `window.shiori`, as in a plain browser or tests, everything stays in `localStorage`.
- On load, entries with the wrong shape are left out with a warning (`withDamagedUserDataRemoved`). `parseBackup` refuses a backup containing any such data.

## Backups

`utils/backup.js` wraps one flat map: `snapshotForBackup()` combines the `localStorage` keys and the file keys. A restore (`restoreBackupData`) first saves a copy of the current state to `<userData>/backups/`, then writes file keys through `user-data:replace` and preferences into `localStorage`, and reloads the page. `settings.json` isn't included in backups.
