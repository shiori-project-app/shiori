import { useEffect } from 'react';
import { Icon } from '@/components/common/Icon';
import { exitFullscreen } from '@/hooks/useFullscreen';

export const PlayerCrashMessage = ({ error, onRetry }) => {
  useEffect(exitFullscreen, []);

  return (
    <div className="player player--empty">
      <div className="player__empty">
        <span className="player__empty-icon">
          <Icon name="replay" />
        </span>

        <h4 className="player__error-title">The player stopped working</h4>
        <p>{error?.message || 'Something went wrong while playing this episode.'}</p>

        <button type="button" className="btn btn--primary" onClick={onRetry}>
          Try again
        </button>
      </div>
    </div>
  );
};
