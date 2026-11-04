import { memo } from 'react';
import { EpisodeLink } from '@/components/anime/EpisodeLink';
import { episodeArtwork, PlayOverlay, WatchedCheck } from '@/components/anime/EpisodeThumbnail';
import { Artwork } from '@/components/common/Artwork';
import { useEpisodeAvailability } from '@/hooks/useEpisodeAvailability';
import { useLibrary, usePlaybackProgress } from '@/hooks/useLibrary';
import { useDisplayTitle, usePreferences } from '@/hooks/usePreferences';
import { cx } from '@/utils/classNames';
import { formatDuration } from '@/utils/format';
import { episodeAge } from '@/utils/series';
import { isWatched } from '@/utils/watched';

const progressPercent = (position, duration) => Math.min(100, (position / duration) * 100);

const EpisodeCardContent = ({ series, episode, showProgress = false }) => {
  const { watched } = useLibrary();
  const progress = usePlaybackProgress();
  const { hideSpoilers } = usePreferences();
  const displayTitle = useDisplayTitle();

  const { state } = useEpisodeAvailability(series)(episode.number);
  const playbackPosition = showProgress ? progress[episode.id] : 0;

  const isEpisodeWatched = isWatched(watched, series.id, episode.number);
  const isDownloaded = state === 'ready';
  const isSpoilerHidden = hideSpoilers && !isEpisodeWatched && !progress[episode.id];

  const seriesTitle = displayTitle(series);

  return (
    <article className={cx('card card--episode', isSpoilerHidden && 'is-spoiler')}>
      <EpisodeLink
        series={series}
        episodeNumber={episode.number}
        state={state}
        className={cx('thumb thumb--wide', episode.thumb && 'has-episode-art')}
        aria-label={`Watch ${seriesTitle} episode ${episode.number}`}
      >
        <Artwork src={episodeArtwork(series, episode)} />
        {isEpisodeWatched && <WatchedCheck />}
        <span className="thumb__ep">EP {episode.number}</span>
        <span className="thumb__duration">{formatDuration(episode.duration)}</span>
        <PlayOverlay isDownloaded={isDownloaded} />

        {playbackPosition > 0 && (
          <span className="thumb__progress">
            <span style={{ width: `${progressPercent(playbackPosition, episode.duration)}%` }} />
          </span>
        )}
      </EpisodeLink>

      <h3 className="card__title">
        <EpisodeLink series={series} episodeNumber={episode.number} state={state} className="card__title-link">
          {seriesTitle}
        </EpisodeLink>
      </h3>

      <p className="card__meta">
        Episode {episode.number}
        {episode.name && (
          <>
            : <span className="spoiler-text">{episode.name}</span>
          </>
        )}{' '}
        · {episodeAge(series, episode.number)}
        {state === 'downloading' && ' · Downloading'}
      </p>
    </article>
  );
};

export const EpisodeCard = memo(EpisodeCardContent);
