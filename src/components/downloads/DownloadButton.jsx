import { Icon } from '@/components/common/Icon';
import { DownloadDialog } from '@/components/downloads/DownloadDialog';
import { useOpenState } from '@/hooks/useOpenState';

export const DownloadButton = ({ series, episode, label, className = 'btn btn--sm', iconOnly = false }) => {
  const [isDialogOpen, openDialog, closeDialog] = useOpenState();

  const buttonText = label ?? (episode ? 'Download' : 'Download season');

  return (
    <>
      <button
        type="button"
        className={className}
        aria-label={iconOnly ? `Download episode ${episode}` : undefined}
        title={iconOnly ? 'Download' : undefined}
        onClick={openDialog}
      >
        <Icon name="download" />
        {!iconOnly && <span>{buttonText}</span>}
      </button>

      {isDialogOpen && <DownloadDialog series={series} episode={episode} onClose={closeDialog} />}
    </>
  );
};
