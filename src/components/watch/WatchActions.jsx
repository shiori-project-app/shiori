import { Link } from 'react-router';
import { showLibraryFile } from '@/api/clients/desktopClient';
import { MyListButton } from '@/components/anime/MyListButton';
import { Icon } from '@/components/common/Icon';
import { DownloadButton } from '@/components/downloads/DownloadButton';
import { watchPath } from '@/constants/routes';
import { useLibrary } from '@/hooks/useLibrary';
import { useShareSeriesLink } from '@/hooks/useShareSeriesLink';
import { cx } from '@/utils/classNames';
import { isWatched } from '@/utils/watched';

const WatchedToggle = ({ seriesId, episodeNumber }) => {
  const { watched, markWatched, unmarkWatched } = useLibrary();

  const isEpisodeWatched = isWatched(watched, seriesId, episodeNumber);

  const toggleWatched = () =>
    isEpisodeWatched ? unmarkWatched(seriesId, episodeNumber) : markWatched(seriesId, episodeNumber);

  return (
    <button
      type="button"
      className={cx('btn btn--sm', isEpisodeWatched && 'is-on')}
      aria-pressed={isEpisodeWatched}
      onClick={toggleWatched}
    >
      <Icon name="check" />
      <span>{isEpisodeWatched ? 'Watched' : 'Mark watched'}</span>
    </button>
  );
};

export const WatchActions = ({ series, episodeNumber, previousEpisode, nextEpisode, file }) => {
  const shareSeriesLink = useShareSeriesLink(series.id);

  return (
    <div className="watch__actions">
      {previousEpisode && (
        <Link className="btn btn--sm" to={watchPath(series.id, previousEpisode)}>
          <Icon name="prev" />
          Prev
        </Link>
      )}

      {nextEpisode && (
        <Link className="btn btn--sm btn--primary" to={watchPath(series.id, nextEpisode)}>
          Next
          <Icon name="next" />
        </Link>
      )}

      <button type="button" className="btn btn--sm" onClick={shareSeriesLink}>
        <Icon name="share" />
        Share
      </button>

      <WatchedToggle seriesId={series.id} episodeNumber={episodeNumber} />
      <MyListButton series={series} className="btn btn--sm" />

      {file ? (
        <button type="button" className="btn btn--sm" onClick={() => showLibraryFile(file.path)}>
          <Icon name="folder" />
          Show in folder
        </button>
      ) : (
        <DownloadButton series={series} episode={episodeNumber} />
      )}
    </div>
  );
};
