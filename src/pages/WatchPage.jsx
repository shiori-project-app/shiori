import { useCallback, useEffect } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { EpisodePanel } from '@/components/anime/EpisodePanel';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { LoadError } from '@/components/common/LoadError';
import { HeroSkeleton } from '@/components/common/Skeleton';
import { Switch } from '@/components/common/Switch';
import { Tags } from '@/components/common/Tags';
import { Notes } from '@/components/notes/Notes';
import { EpisodeUnavailable } from '@/components/player/EpisodeUnavailable';
import { Player } from '@/components/player/Player';
import { PlayerCrashMessage } from '@/components/player/PlayerCrashMessage';
import { WatchActions } from '@/components/watch/WatchActions';
import { seriesPath } from '@/constants/routes';
import { useEpisodeAvailability } from '@/hooks/useEpisodeAvailability';
import { useEpisodeTitles } from '@/hooks/useEpisodeTitles';
import { exitFullscreen } from '@/hooks/useFullscreen';
import { useLibrary } from '@/hooks/useLibrary';
import { useDisplayTitle } from '@/hooks/usePreferences';
import { useSeries } from '@/hooks/useSeries';
import { useSession } from '@/hooks/useSession';
import { NotFound } from '@/pages/NotFound';
import { cx } from '@/utils/classNames';
import { buildEpisode } from '@/utils/episodes';
import { episodeAge } from '@/utils/series';

const EpisodesSidebar = ({ series, currentEpisode }) => {
  const { autoplay, toggleAutoplay } = useLibrary();

  return (
    <aside className="watch__side">
      <div className="watch__side-head">
        <b className="watch__side-title">Episodes</b>
        <Switch label="Autoplay" checked={autoplay} onChange={toggleAutoplay} />
      </div>

      <EpisodePanel series={series} current={currentEpisode} variant="side" />
    </aside>
  );
};

const WatchView = ({ series, episodeNumber }) => {
  const { addToHistory, markWatched } = useLibrary();
  const { theater } = useSession();
  const displayTitle = useDisplayTitle();
  const extraTitles = useEpisodeTitles(series, episodeNumber, episodeNumber);

  const episode = buildEpisode(series, episodeNumber, extraTitles);
  const previousEpisode = episodeNumber > 1 ? episodeNumber - 1 : null;

  const nextEpisode = episodeNumber < series.released ? episodeNumber + 1 : null;

  const availabilityOf = useEpisodeAvailability(series);

  const { state, file } = availabilityOf(episodeNumber);
  const isDownloaded = state === 'ready';

  const recordStarted = useCallback(() => addToHistory(episode.id), [addToHistory, episode.id]);

  const recordWatched = useCallback(
    () => markWatched(series.id, episodeNumber),
    [markWatched, series.id, episodeNumber],
  );

  return (
    <div className={cx('watch', theater && 'watch--theater')}>
      <section>
        {isDownloaded ? (
          <ErrorBoundary fallback={PlayerCrashMessage} resetKey={episode.id}>
            <Player
              series={series}
              episode={episode}
              file={file}
              nextEpisode={nextEpisode}
              nextReady={nextEpisode != null && availabilityOf(nextEpisode).state === 'ready'}
              onStarted={recordStarted}
              onWatched={recordWatched}
            />
          </ErrorBoundary>
        ) : (
          <EpisodeUnavailable series={series} episodeNumber={episodeNumber} state={state} />
        )}

        <h1 className="watch__title">
          {displayTitle(series)} · Episode {episodeNumber}
        </h1>

        <p className="watch__episode">{episode.name}</p>

        <p className="watch__sub">
          <Link to={seriesPath(series.id)}>Series details</Link>
          {series.studio && ` · ${series.studio}`} · {episodeAge(series, episodeNumber)}
        </p>

        <WatchActions
          series={series}
          episodeNumber={episodeNumber}
          previousEpisode={previousEpisode}
          nextEpisode={nextEpisode}
          file={isDownloaded ? file : null}
        />

        <div className="watch__synopsis">
          <Tags items={series.genres} />
          <p>{series.synopsis || 'No synopsis available.'}</p>
        </div>

        <Notes episodeId={episode.id} />
      </section>

      <EpisodesSidebar series={series} currentEpisode={episodeNumber} />
    </div>
  );
};

const isReleasedEpisode = (series, episodeNumber) => episodeNumber >= 1 && episodeNumber <= series.released;

export const WatchPage = () => {
  const { id, ep } = useParams();
  const { data: series, error, loading, retry } = useSeries(Number(id));

  const episodeNumber = Number(ep);

  useEffect(() => exitFullscreen, []);

  if (error) return <LoadError error={error} onRetry={retry} />;
  if (loading) return <HeroSkeleton />;
  if (!series) return <NotFound />;
  if (!isReleasedEpisode(series, episodeNumber)) return <Navigate to={seriesPath(series.id)} replace />;

  return <WatchView key={`${series.id}-${episodeNumber}`} series={series} episodeNumber={episodeNumber} />;
};
