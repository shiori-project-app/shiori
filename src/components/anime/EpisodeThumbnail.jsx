import { Artwork } from '@/components/common/Artwork';
import { Icon } from '@/components/common/Icon';
import { cx } from '@/utils/classNames';
import { formatDuration } from '@/utils/format';

export const episodeArtwork = (series, episode) => episode.thumb || series.banner || series.cover;

export const WatchedCheck = () => (
  <span className="thumb__watched" title="Watched">
    <Icon name="check" />
  </span>
);

export const PlayOverlay = ({ isDownloaded }) => (
  <span className={cx('thumb__play', !isDownloaded && 'thumb__play--download')}>
    <Icon name={isDownloaded ? 'play' : 'download'} />
  </span>
);

export const EpisodeThumbnail = ({ series, episode, isWatched, isDownloaded, showPlayOverlay = true }) => (
  <div className={cx('thumb thumb--wide', episode.thumb && 'has-episode-art')}>
    <Artwork src={episodeArtwork(series, episode)} />
    {isWatched && <WatchedCheck />}
    <span className="thumb__duration">{formatDuration(episode.duration)}</span>
    {showPlayOverlay && <PlayOverlay isDownloaded={isDownloaded} />}
  </div>
);
