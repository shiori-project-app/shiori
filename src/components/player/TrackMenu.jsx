import { Icon } from '@/components/common/Icon';
import { cx } from '@/utils/classNames';
import { trackLabel } from '@/utils/player';

const MenuOption = ({ isActive, onClick, children }) => (
  <button type="button" className={cx('player__menu-option', isActive && 'is-active')} onClick={onClick}>
    <span>{children}</span>
    {isActive && <Icon name="check" />}
  </button>
);

const SubtitleOptions = ({ subtitles }) => {
  if (subtitles.loading) return <p className="player__menu-note">Reading subtitles…</p>;

  if (subtitles.error) {
    return <p className="player__menu-note">Couldn’t read the subtitles: {subtitles.error.message}</p>;
  }

  return (
    <>
      <MenuOption isActive={subtitles.current == null} onClick={() => subtitles.select(null)}>
        Off
      </MenuOption>

      {subtitles.tracks.map((track, index) => (
        <MenuOption
          key={track.number}
          isActive={track.number === subtitles.current}
          onClick={() => subtitles.select(track.number)}
        >
          {trackLabel(track, index)}
        </MenuOption>
      ))}

      {!subtitles.tracks.length && <p className="player__menu-note">None in this file (they may be burned in).</p>}
    </>
  );
};

const AudioOptions = ({ audio }) => (
  <>
    <p className="player__menu-title">Audio</p>

    {audio.tracks.map((track, index) => (
      <MenuOption key={track.index} isActive={track.enabled} onClick={() => audio.select(track.index)}>
        {trackLabel({ name: track.label, language: track.language }, index)}
      </MenuOption>
    ))}
  </>
);

export const TrackMenu = ({ subtitles, audio }) => (
  <div className="player__menu" role="dialog" aria-label="Subtitles and audio">
    <p className="player__menu-title">Subtitles</p>
    <SubtitleOptions subtitles={subtitles} />
    {audio.tracks.length > 1 && <AudioOptions audio={audio} />}
  </div>
);
