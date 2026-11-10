# Components: player, watch, notes

## `src/components/player/`

- `Player` renders the video element and subtitle overlay with the pieces below, and wires up `useVideoPlayer`, `usePlayerHotkeys`, `useAudioTracks`, `useSubtitles`, `useSkipSegments` and `usePlaybackMilestones`. It opens paused unless `usePlayOnOpen` says otherwise.
- `PlayerControls` holds the seek bar with skip-segment marks, time, volume, speed, tracks, picture-in-picture, theater and fullscreen. It's memoized, and only the seek bar and clock read `VideoTimeContext`, so they alone update on each time tick.
- `TrackMenu` is the subtitle and audio track menu.
- `PictureInPictureNote` covers the stage while the video plays in picture-in-picture, with a "Bring it back" button.
- `PlaybackIndicator` shows the loading spinner while the video waits, or the big play and pause icon.
- `SkipSegmentButton` is the "Skip intro" or "Skip ending" button. It shows on its own with a draining bar while `isPrompting`. The bar's width is `promptRemaining`, set on each time update with a short transition, so it pauses, buffers, seeks and changes speed with the video. With reduced motion it stays full and still. After that it shows only with the player controls, or while the pointer rests on it. The `s` key skips the whole time.
- `EndCard` appears after an episode, offering replay and the next episode with an autoplay countdown, or a download if it isn't available. The countdown and "Play next" open the next episode already playing.
- `EpisodeUnavailable` offers a download when the episode isn't downloaded.
- `PlaybackError` shows "Shiori can’t play this file", with open-externally and show-in-folder actions.
- `PlayerCrashMessage` is the `ErrorBoundary` fallback for the player.

## Others

- `watch/WatchActions` provides mark watched, previous and next episode, share, and show file in folder.
- `notes/Notes` provides per-episode notes: add, list and delete.
