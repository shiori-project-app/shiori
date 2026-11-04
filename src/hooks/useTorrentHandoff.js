import { useCallback } from 'react';
import { openMagnetInTorrentApp } from '@/api/services/torrentService';
import { useToast } from '@/hooks/useToast';

const NO_TORRENT_APP_MESSAGE = 'No app is set up for magnet links. Install a torrent app such as qBittorrent.';

const handedOffMessage = (torrentApp) => (torrentApp ? `Added to ${torrentApp}` : 'Sent to your torrent app');

export const useTorrentHandoff = (series) => {
  const showToast = useToast();

  const openMagnet = useCallback(
    (magnet, messageSuffix = '') =>
      openMagnetInTorrentApp(magnet, series).then(
        ({ app }) => showToast(`${handedOffMessage(app)}${messageSuffix}`),
        () => showToast(NO_TORRENT_APP_MESSAGE),
      ),
    [series, showToast],
  );

  const copyMagnet = useCallback(
    (magnet) =>
      navigator.clipboard.writeText(magnet).then(
        () => showToast('Magnet link copied'),
        () => showToast('Couldn’t copy the magnet link'),
      ),
    [showToast],
  );

  return { openMagnet, copyMagnet };
};
