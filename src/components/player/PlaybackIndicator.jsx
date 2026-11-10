import { memo } from 'react';
import { Icon } from '@/components/common/Icon';

const PlaybackIndicatorContent = ({ player }) => {
  if (player.error) return null;
  if (player.waiting) return player.ended ? null : <span className="player__spinner" aria-label="Loading" />;

  return (
    <div className="player__big">
      <span className="player__big-icon">
        <Icon name={player.playing ? 'pause' : 'play'} />
      </span>
    </div>
  );
};

export const PlaybackIndicator = memo(PlaybackIndicatorContent);
