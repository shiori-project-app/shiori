import { memo, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Icon } from '@/components/common/Icon';
import { DownloadButton } from '@/components/downloads/DownloadButton';
import { AUTOPLAY_COUNTDOWN_S } from '@/config/app.config';
import { PLAY_ON_OPEN, seriesPath, watchPath } from '@/constants/routes';
import { useLibrary } from '@/hooks/useLibrary';
import { useDisplayTitle } from '@/hooks/usePreferences';

const SECOND_MS = 1000;

const AutoplayCountdown = ({ seriesId, nextEpisode }) => {
  const navigate = useNavigate();

  const [secondsLeft, setSecondsLeft] = useState(AUTOPLAY_COUNTDOWN_S);

  useEffect(() => {
    if (secondsLeft <= 0) {
      navigate(watchPath(seriesId, nextEpisode), { state: PLAY_ON_OPEN });

      return;
    }

    const tickTimer = setTimeout(() => setSecondsLeft((seconds) => seconds - 1), SECOND_MS);

    return () => clearTimeout(tickTimer);
  }, [secondsLeft, seriesId, nextEpisode, navigate]);

  return <div>{secondsLeft > 0 && `Playing next in ${secondsLeft}…`}</div>;
};

const NextStepButton = ({ series, nextEpisode, nextReady }) => {
  if (nextEpisode && nextReady) {
    return (
      <Link className="btn btn--primary" to={watchPath(series.id, nextEpisode)} state={PLAY_ON_OPEN}>
        Play next
      </Link>
    );
  }

  if (nextEpisode) {
    return (
      <DownloadButton
        series={series}
        episode={nextEpisode}
        className="btn btn--primary"
        label={`Download EP ${nextEpisode}`}
      />
    );
  }

  return (
    <Link className="btn btn--primary" to={seriesPath(series.id)}>
      Series details
    </Link>
  );
};

const EndCardContent = ({ series, nextEpisode, nextReady, ended, onReplay }) => {
  const { autoplay } = useLibrary();
  const displayTitle = useDisplayTitle();

  const shouldAutoplay = ended && autoplay && nextEpisode && nextReady;

  return (
    <div className="player__endcard">
      <h4 className="player__endcard-title">
        {nextEpisode ? `Up next: Episode ${nextEpisode}` : `You’re caught up on ${displayTitle(series)}`}
      </h4>

      {shouldAutoplay && <AutoplayCountdown seriesId={series.id} nextEpisode={nextEpisode} />}
      {nextEpisode && !nextReady && <div>Episode {nextEpisode} isn’t downloaded yet.</div>}

      <div className="player__endcard-actions">
        <button type="button" className="btn" onClick={onReplay}>
          <Icon name="replay" />
          Replay
        </button>

        <NextStepButton series={series} nextEpisode={nextEpisode} nextReady={nextReady} />
      </div>
    </div>
  );
};

export const EndCard = memo(EndCardContent);
