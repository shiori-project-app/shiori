# Contexts (`src/context/`)

`app/AppProviders.jsx` composes the providers in this order: Toast, Appearance, Preferences, Settings, `UserDataGate`, Library, Session, Downloads, LocalFiles, Tracking. Each has a `useX` hook in `src/hooks/`, except LocalFiles, which is read with `useContext(LocalFilesContext)`.

- `ToastContext` provides `showToast(message, ms)`. It also shows storage and save failure warnings once.
- `AppearanceContext` provides `theme`, `accent`, `accentForTheme`, `setTheme` and `setAccent`. It applies them to `<html>` and saves them in `localStorage`.
- `PreferencesContext` provides `titleLanguage`, `hideEcchi`, `hideSpoilers`, `autoSkip`, `reduceMotion`, `cleanupAfterDays`, `cleanupAction` and `setPreference`. Values are saved in `localStorage`.
- `SettingsContext` provides the main-process settings:
  - From `settings.json`: `downloadDir`, `maxParallelDownloads`, `speedLimitKBps`, `smoothGraphics`, `cleanupMoveFolder` and `keepRunningInTray`.
  - From the running system rather than the file: `smoothGraphicsAtLaunch`, `platform`, `canKeepRunningInTray`, `startAtLogin` and `canStartAtLogin`.
  - Actions: `chooseDownloadDir`, `updateBackground`, `chooseCleanupMoveFolder`, `openDownloadDir`, `updateDownloads`, `updateGraphics` and `restartApp`.
- `LibraryContext` provides the user's library:
  - State: `list`, `watched`, `watchDates`, `history`, `notes` and `fileLinks` from the user data files, and `autoplay` from `localStorage`.
  - `progress` lives in its own `PlaybackProgressContext` (`usePlaybackProgress`). The player saves it every 15 s, and that must not re-render everything that reads the library.
  - Actions: `setListStatus`, `removeFromList`, `markWatched`, `unmarkWatched`, `importList`, `addToHistory`, `clearHistory`, `saveProgress`, `toggleAutoplay`, `addNote`, `deleteNote`, `linkEpisodeFile`, `unlinkEpisodeFile`, `linkFolder` and `unlinkFolder`.
- `SessionContext` provides state that isn't saved: `theater` mode and the chosen episode block per series.
- `DownloadsContext` provides the download queue:
  - `downloads` is the main-process queue reduced to `id`, `seriesId`, `episode` and `state`, and changes only when one of those does.
  - `useLiveDownloads()` returns full jobs with bytes and speed, at about 5 updates a second. Use it only to show progress.
  - Actions: `queueEpisodes`, `retry`, `pause`, `resume`, `pauseAll`, `resumeAll`, `cancel`, `move`, `remove`, `clearFinished` and `showInFolder`.
- `LocalFilesContext` provides the library scan (`root`, `files`, `isUnreachable`) and `rescan`:
  - Tracking and offline sync do nothing while the folder is unreachable, because an empty list proves nothing.
  - It rescans when a download finishes and on window focus, at most every 15 s, and keeps the old list when nothing changed.
- `TrackingContext` provides `tracked` (from a user data file), `checking`, `nextCheckAt`, `track`, `untrack`, `checkNow` and `markEpisodesHandled`, which stops tracking from downloading those episodes again. It schedules checks and checks again on system resume. A check requested during a running check waits its turn (`withQueuedCheck`).
