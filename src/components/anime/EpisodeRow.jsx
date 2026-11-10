import { memo } from 'react';
import { showLibraryFile } from '@/api/clients/desktopClient';
import { EpisodeLink } from '@/components/anime/EpisodeLink';
import { EpisodeThumbnail } from '@/components/anime/EpisodeThumbnail';
import { Icon } from '@/components/common/Icon';
import { WatchedBadge } from '@/components/common/WatchedBadge';
import { useLibrary } from '@/hooks/useLibrary';
import { usePreferences } from '@/hooks/usePreferences';
import { cx } from '@/utils/classNames';
import { episodeAge } from '@/utils/series';
import { isWatched } from '@/utils/watched';

const AVAILABILITY_LABELS = { ready: 'Downloaded', downloading: 'Downloading' };

const EpisodeStatus = ({ series, episode, isNowPlaying, isEpisodeWatched }) => {
  if (isNowPlaying) return 'Now playing';
  if (isEpisodeWatched) return <WatchedBadge />;

  return episodeAge(series, episode.number);
};

const ShowInFolderButton = ({ episodeNumber, file }) => (
  <button
    type="button"
    className="episode-row__download is-downloaded"
    aria-label={`Show episode ${episodeNumber} in folder`}
    title={file.name}
    onClick={() => showLibraryFile(file.path)}
  >
    <Icon name="folder" />
  </button>
);

const EpisodeListItem = ({ series, episode, current = false, state, file, resolution }) => {
  const { watched } = useLibrary();
  const { hideSpoilers } = usePreferences();

  const isEpisodeWatched = isWatched(watched, series.id, episode.number);
  const isDownloaded = state === 'ready';
  const isNowPlaying = current && isDownloaded;

  const isSpoilerHidden = hideSpoilers && !isEpisodeWatched && !current;

  return (
    <div
      className={cx(
        'episode-row',
        current && 'is-current',
        isEpisodeWatched && 'is-watched',
        isSpoilerHidden && 'is-spoiler',
      )}
    >
      <EpisodeLink
        series={series}
        episodeNumber={episode.number}
        state={state}
        className="episode-row__link"
        aria-current={current ? 'true' : undefined}
      >
        <EpisodeThumbnail
          series={series}
          episode={episode}
          isWatched={isEpisodeWatched}
          isDownloaded={isDownloaded}
          showPlayOverlay={!isNowPlaying}
        />

        <div>
          <h3 className="episode-row__title">
            {episode.name ? <span className="spoiler-text">{episode.name}</span> : `Episode ${episode.number}`}
          </h3>

          <p className="episode-row__meta">
            {episode.name && `Episode ${episode.number} · `}

            <EpisodeStatus
              series={series}
              episode={episode}
              isNowPlaying={isNowPlaying}
              isEpisodeWatched={isEpisodeWatched}
            />

            {AVAILABILITY_LABELS[state] && (
              <span className="episode-row__downloaded">
                {' '}
                · {AVAILABILITY_LABELS[state]}
                {resolution && ` · ${resolution}`}
              </span>
            )}
          </p>
        </div>
      </EpisodeLink>

      {file && <ShowInFolderButton episodeNumber={episode.number} file={file} />}
    </div>
  );
};

export const EpisodeRow = memo(EpisodeListItem);
