import { useCallback, useRef, useState } from 'react';
import { EndCard } from '@/components/player/EndCard';
import { PlaybackError } from '@/components/player/PlaybackError';
import { PlaybackIndicator } from '@/components/player/PlaybackIndicator';
import { PictureInPictureNote } from '@/components/player/PictureInPictureNote';
import { PlayerControls, VideoTimeContext } from '@/components/player/PlayerControls';
import { SkipSegmentButton } from '@/components/player/SkipSegmentButton';
import { TrackMenu } from '@/components/player/TrackMenu';
import { PLAYER_IDLE_MS } from '@/config/app.config';
import { useAudioTracks } from '@/hooks/useAudioTracks';
import { useFullscreen } from '@/hooks/useFullscreen';
import { useIdle } from '@/hooks/useIdle';
import { usePlaybackProgress } from '@/hooks/useLibrary';
import { usePauseWhenHiddenToTray } from '@/hooks/usePauseWhenHiddenToTray';
import { usePictureInPicture } from '@/hooks/usePictureInPicture';
import { usePlaybackMilestones } from '@/hooks/usePlaybackMilestones';
import { usePlayerHotkeys } from '@/hooks/usePlayerHotkeys';
import { usePlayOnOpen } from '@/hooks/usePlayOnOpen';
import { usePreferences } from '@/hooks/usePreferences';
import { useSession } from '@/hooks/useSession';
import { useSkipSegments } from '@/hooks/useSkipSegments';
import { useSubtitles } from '@/hooks/useSubtitles';
import { useVideoPlayer } from '@/hooks/useVideoPlayer';
import { cx } from '@/utils/classNames';
import { localVideoUrl } from '@/utils/media';
import { isPlayerControlTarget } from '@/utils/player';

export const Player = ({ series, episode, file, nextEpisode, nextReady, onStarted, onWatched }) => {
  const progress = usePlaybackProgress();
  const { toggleTheater } = useSession();
  const { autoSkip } = usePreferences();

  const stageRef = useRef(null);
  const videoRef = useRef(null);
  const subtitleOverlayRef = useRef(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [startAt] = useState(() => progress[episode.id] ?? 0);

  const { time, player } = useVideoPlayer(videoRef, startAt);
  const subtitles = useSubtitles(file, videoRef, subtitleOverlayRef);
  const audio = useAudioTracks(videoRef);
  const [isIdle, markActive] = useIdle(PLAYER_IDLE_MS);
  const toggleFullscreen = useFullscreen(stageRef);
  const pictureInPicture = usePictureInPicture(videoRef);

  const skipSegments = useSkipSegments({
    malId: series.malId,
    episode: episode.number,
    duration: player.duration,
    time,
    playing: player.playing,
    seek: player.seek,
    auto: autoSkip,
  });

  usePlayerHotkeys({
    ...player,
    toggleFullscreen,
    toggleTheater,
    toggleSubtitles: subtitles.toggle,
    togglePictureInPicture: pictureInPicture.toggle,
    skipSegment: skipSegments.skip,
  });

  usePlaybackMilestones({ episodeId: episode.id, player, time, onStarted, onWatched });

  const { play, seek, toggle } = player;

  usePlayOnOpen(play);
  usePauseWhenHiddenToTray(videoRef, player.pause);

  const replay = useCallback(() => {
    seek(0);
    play();
  }, [seek, play]);

  const toggleMenu = useCallback(() => setIsMenuOpen((isOpen) => !isOpen), []);

  const handleStageClick = (event) => {
    if (isPlayerControlTarget(event)) return;

    if (isMenuOpen) setIsMenuOpen(false);
    else toggle();
  };

  const handleStageDoubleClick = (event) => !isPlayerControlTarget(event) && toggleFullscreen();

  return (
    <div
      ref={stageRef}
      className={cx(
        'player',
        player.playing && 'is-playing',
        isIdle && !isMenuOpen && 'is-idle',
        player.ended && 'has-ended',
      )}
      onClick={handleStageClick}
      onDoubleClick={handleStageDoubleClick}
      onMouseMove={markActive}
      onTouchStart={markActive}
      onFocus={markActive}
    >
      <video ref={videoRef} className="player__video" src={localVideoUrl(file)} preload="auto" />
      <div ref={subtitleOverlayRef} className="player__subs" />

      {pictureInPicture.isActive ? (
        <PictureInPictureNote onReturn={pictureInPicture.toggle} />
      ) : (
        <PlaybackIndicator player={player} />
      )}

      {player.error && <PlaybackError file={file} />}
      <SkipSegmentButton skipSegments={skipSegments} hasEnded={player.ended} />

      <EndCard series={series} nextEpisode={nextEpisode} nextReady={nextReady} ended={player.ended} onReplay={replay} />

      {isMenuOpen && <TrackMenu subtitles={subtitles} audio={audio} />}

      <VideoTimeContext value={time}>
        <PlayerControls
          player={player}
          skipSegments={skipSegments.segments}
          hasSubtitles={subtitles.current != null}
          isMenuOpen={isMenuOpen}
          onToggleMenu={toggleMenu}
          onToggleTheater={toggleTheater}
          onToggleFullscreen={toggleFullscreen}
          pictureInPicture={pictureInPicture}
        />
      </VideoTimeContext>
    </div>
  );
};
