import { createContext, memo, useContext } from 'react';
import { Icon } from '@/components/common/Icon';
import { cx } from '@/utils/classNames';
import { formatDuration } from '@/utils/format';
import { describeSegments, playedPercent, segmentMarksGradient } from '@/utils/player';

const SEEK_STEPS = 1000;
const VOLUME_STEPS = 100;

export const VideoTimeContext = createContext(0);

const PlayerButton = ({ label, onClick, className, children, ...buttonProps }) => (
  <button type="button" className={cx('player__btn', className)} aria-label={label} onClick={onClick} {...buttonProps}>
    {children}
  </button>
);

const SEGMENTS_DESCRIPTION_ID = 'player-skip-segments';

const SeekBar = ({ duration, segments, onSeek }) => {
  const time = useContext(VideoTimeContext);

  const percent = playedPercent(time, duration);
  const segmentsText = describeSegments(segments);

  return (
    <>
      <input
        className="range player__seek"
        type="range"
        min="0"
        max={SEEK_STEPS}
        step="1"
        aria-label="Seek"
        aria-valuetext={`${formatDuration(time)} of ${formatDuration(duration)}`}
        aria-describedby={segmentsText ? SEGMENTS_DESCRIPTION_ID : undefined}
        title={segmentsText || undefined}
        value={(percent / 100) * SEEK_STEPS}
        style={{ '--p': `${percent}%`, '--segment-marks': segmentMarksGradient(segments, duration) }}
        onChange={(event) => onSeek((event.target.value / SEEK_STEPS) * duration)}
      />

      {segmentsText && (
        <span id={SEGMENTS_DESCRIPTION_ID} className="sr-only">
          {segmentsText}
        </span>
      )}
    </>
  );
};

const PlayerClock = ({ duration }) => {
  const time = useContext(VideoTimeContext);

  return (
    <span className="player__time">
      {formatDuration(time)} / {formatDuration(duration)}
    </span>
  );
};

const VolumeControl = ({ volume, muted, onToggleMute, onVolumeChange }) => {
  const soundLevel = muted ? 0 : volume;

  return (
    <>
      <PlayerButton label={muted ? 'Unmute' : 'Mute'} onClick={onToggleMute}>
        <Icon name={soundLevel === 0 ? 'mute' : 'volume'} />
      </PlayerButton>

      <input
        className="range player__volume"
        type="range"
        min="0"
        max={VOLUME_STEPS}
        step="1"
        aria-label="Volume"
        value={Math.round(soundLevel * VOLUME_STEPS)}
        style={{ '--p': `${soundLevel * 100}%` }}
        onChange={(event) => onVolumeChange(event.target.value / VOLUME_STEPS)}
      />
    </>
  );
};

const PlayerControlsContent = ({
  player,
  skipSegments,
  hasSubtitles,
  isMenuOpen,
  onToggleMenu,
  onToggleTheater,
  onToggleFullscreen,
  pictureInPicture,
}) => (
  <div className="player__controls">
    <SeekBar duration={player.duration} segments={skipSegments} onSeek={player.seek} />

    <div className="player__bar">
      <PlayerButton label={player.playing ? 'Pause' : 'Play'} onClick={player.toggle}>
        <Icon name={player.playing ? 'pause' : 'play'} />
      </PlayerButton>

      <VolumeControl
        volume={player.volume}
        muted={player.muted}
        onToggleMute={player.toggleMute}
        onVolumeChange={player.setVolume}
      />

      <PlayerClock duration={player.duration} />

      <span className="player__spacer" />

      <PlayerButton
        label="Subtitles and audio"
        className={hasSubtitles && 'is-on'}
        aria-expanded={isMenuOpen}
        onClick={onToggleMenu}
      >
        <Icon name="captions" />
      </PlayerButton>

      <PlayerButton label="Playback speed" className="player__rate" onClick={player.cycleRate}>
        {player.rate}×
      </PlayerButton>

      {pictureInPicture.isSupported && (
        <PlayerButton
          label={pictureInPicture.isActive ? 'Exit picture-in-picture' : 'Picture-in-picture'}
          className={pictureInPicture.isActive && 'is-on'}
          onClick={pictureInPicture.toggle}
        >
          <Icon name="pip" />
        </PlayerButton>
      )}

      <PlayerButton label="Theater mode" onClick={onToggleTheater}>
        <Icon name="theater" />
      </PlayerButton>

      <PlayerButton label="Fullscreen" onClick={onToggleFullscreen}>
        <Icon name="fullscreen" />
      </PlayerButton>
    </div>
  </div>
);

export const PlayerControls = memo(PlayerControlsContent);
