import { Link } from 'react-router';
import { Artwork } from '@/components/common/Artwork';
import { Icon } from '@/components/common/Icon';
import { DownloadButton } from '@/components/downloads/DownloadButton';
import { LinkFilesButton } from '@/components/downloads/LinkFilesButton';
import { ROUTES } from '@/constants/routes';

export const EpisodeUnavailable = ({ series, episodeNumber, state }) => {
  const isDownloading = state === 'downloading';

  return (
    <div className="player player--empty">
      <Artwork src={series.banner || series.coverLarge || series.cover} hidePlaceholderLabel />

      <div className="player__empty">
        <span className="player__empty-icon">
          <Icon name="download" />
        </span>

        <h4 className="player__error-title">
          {isDownloading ? `Episode ${episodeNumber} is downloading` : `Episode ${episodeNumber} isn’t downloaded yet`}
        </h4>

        <p>
          {isDownloading
            ? 'It plays here as soon as the download finishes.'
            : 'Download it to watch it here in Shiori.'}
        </p>

        {isDownloading ? (
          <Link className="btn" to={ROUTES.downloads}>
            See downloads
          </Link>
        ) : (
          <div className="cta cta--center">
            <DownloadButton
              series={series}
              episode={episodeNumber}
              className="btn btn--primary"
              label={`Download episode ${episodeNumber}`}
            />

            <LinkFilesButton series={series} episode={episodeNumber} className="btn" label="I already have it" />
          </div>
        )}
      </div>
    </div>
  );
};
