# Components: settings (`src/components/settings/`)

Tabs come from `constants/settingsTabs.js`, and `SettingsPage` renders the active panel.

- `SettingsSection`, `SettingsList` and `SettingsRow` are the layout pieces for every panel.
- `AppearancePanel` combines `ThemePicker` and `AccentPicker`.
- `ThemePicker` shows theme cards with previews, grouped by family. It's one Tab stop with arrow keys (`useArrowKeySelection`).
- `AccentPicker` shows accent colour swatches for the current theme. It's one Tab stop with arrow keys.
- `DisplayPanel` holds title language, hide ecchi, hide spoilers, reduce motion and `SmoothGraphicsRow`.
- `SmoothGraphicsRow` is the smoother scrolling and faster seeking toggle (`smoothGraphics`). It shows a Restart button while the saved value differs from the launch value.
- `PlaybackPanel` holds auto-skip for intros and endings.
- `DownloadsPanel` holds the download folder, parallel downloads, speed limit and `BackgroundSection`.
- `BackgroundSection` holds keep running in the tray, which is locked if the desktop has no tray area, and start with Windows (start when you sign in on Linux), which is available only in the installed app.
- `BackupPanel` exports and restores backups and exports the list for MyAnimeList, using `useBackupActions`.
- `StoragePanel` shows `DownloadFolderSection`, then the sizes of the subtitle cache and saved AniList data, each with a Clear button. Clearing AniList data is disabled offline.
- `DownloadFolderSection` shows the disk usage readout and the cleanup settings (days, and Recycle Bin, Trash or a move folder), and opens `WatchedCleanupDialog` using `useWatchedCleanup`.
- `WatchedCleanupDialog` lists the exact files to clean up with checkboxes, leaving partial name matches unticked. It shows confirmation, progress, then what failed and why, and can't be closed while running.
- `RestoreBackupDialog` confirms a restore and shows the backup's counts and any restore error. It can't be closed while restoring.
