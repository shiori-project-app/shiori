import { getTorrentApp } from '@/api/services/torrentService';
import { useAsync } from '@/hooks/useAsync';
import { useSettings } from '@/hooks/useSettings';
import { showFolderLabel } from '@/utils/downloads';

export const TorrentAppHint = ({ series }) => {
  const { downloadDir } = useSettings();

  const torrentApp = useAsync(getTorrentApp, []).data;

  return (
    <p className="download-panel__hint">
      {torrentApp
        ? `“Open” adds the torrent to ${torrentApp}, saving to ${showFolderLabel(downloadDir, series.title)}.`
        : '“Open” sends the magnet link to your torrent app, which saves it to its usual folder.'}
    </p>
  );
};
