import { Icon } from '@/components/common/Icon';
import { LinkFilesDialog } from '@/components/downloads/LinkFilesDialog';
import { useOpenState } from '@/hooks/useOpenState';

export const LinkFilesButton = ({ series, episode, className = 'btn btn--ghost', label = 'Link files' }) => {
  const [isOpen, openDialog, closeDialog] = useOpenState();

  return (
    <>
      <button type="button" className={className} onClick={openDialog}>
        <Icon name="folder" />
        {label}
      </button>

      {isOpen && <LinkFilesDialog series={series} episode={episode} onClose={closeDialog} />}
    </>
  );
};
