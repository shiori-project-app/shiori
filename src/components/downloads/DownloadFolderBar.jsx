import { Icon } from '@/components/common/Icon';
import { useSettings } from '@/hooks/useSettings';
import { useToast } from '@/hooks/useToast';

export const DownloadFolderBar = () => {
  const { downloadDir, chooseDownloadDir, openDownloadDir } = useSettings();
  const showToast = useToast();

  const openFolder = () => openDownloadDir().catch((error) => showToast(`Couldn’t open the folder: ${error.message}`));

  return (
    <div className="folder-bar">
      <Icon name="folder" />

      <span className="folder-bar__path" title={downloadDir}>
        {downloadDir || '…'}
      </span>

      <button type="button" className="btn btn--sm" onClick={openFolder}>
        Open
      </button>

      <button type="button" className="btn btn--sm" onClick={chooseDownloadDir}>
        Change folder
      </button>
    </div>
  );
};
