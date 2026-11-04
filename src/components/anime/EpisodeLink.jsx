import { Link } from 'react-router';
import { DownloadDialog } from '@/components/downloads/DownloadDialog';
import { watchPath } from '@/constants/routes';
import { useOpenState } from '@/hooks/useOpenState';

export const EpisodeLink = ({ series, episodeNumber, state, children, ...linkProps }) => {
  const [isDownloadDialogOpen, openDownloadDialog, closeDownloadDialog] = useOpenState();

  if (state !== 'missing') {
    return (
      <Link to={watchPath(series.id, episodeNumber)} {...linkProps}>
        {children}
      </Link>
    );
  }

  return (
    <>
      <button
        type="button"
        {...linkProps}
        aria-label={`Download episode ${episodeNumber}`}
        onClick={openDownloadDialog}
      >
        {children}
      </button>

      {isDownloadDialogOpen && <DownloadDialog series={series} episode={episodeNumber} onClose={closeDownloadDialog} />}
    </>
  );
};
