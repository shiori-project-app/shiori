import { useContext, useEffect, useEffectEvent, useState } from 'react';
import { hasDesktopBridge } from '@/api/clients/desktopClient';
import { onOfflineStoreChange } from '@/api/services/offlineStore';
import { requestOfflineSync } from '@/api/services/offlineSyncService';
import { LocalFilesContext } from '@/context/LocalFilesContext';
import { useDownloads } from '@/hooks/useDownloads';
import { useLibrary } from '@/hooks/useLibrary';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useTracking } from '@/hooks/useTracking';

const SYNC_DELAY_MS = 5000;

const sortedKey = (values) => [...new Set(values.map(String))].sort().join(',');

const useOfflineStoreVersion = () => {
  const [version, setVersion] = useState(0);

  useEffect(() => onOfflineStoreChange(() => setVersion((currentVersion) => currentVersion + 1)), []);

  return version;
};

export const useOfflineSync = () => {
  const { list, history, fileLinks } = useLibrary();
  const { tracked } = useTracking();
  const { downloads } = useDownloads();
  const { root, files, isUnreachable } = useContext(LocalFilesContext);
  const isOnline = useOnlineStatus();
  const offlineStoreVersion = useOfflineStoreVersion();

  const syncLatestInputs = useEffectEvent(() =>
    requestOfflineSync({ list, history, tracked, downloads, files, fileLinks, root }),
  );

  const listKey = sortedKey(Object.keys(list));
  const historyKey = history.join(',');

  const trackedKey = sortedKey(Object.keys(tracked));
  const fileLinksKey = JSON.stringify(fileLinks);

  const downloadsKey = sortedKey(downloads.map((download) => download.seriesId));
  const hasScanned = Boolean(root);

  useEffect(() => {
    if (!hasDesktopBridge() || !isOnline || !hasScanned || isUnreachable) return;

    const syncTimer = setTimeout(syncLatestInputs, SYNC_DELAY_MS);

    return () => clearTimeout(syncTimer);
  }, [
    isOnline,
    hasScanned,
    isUnreachable,
    files,
    listKey,
    historyKey,
    trackedKey,
    fileLinksKey,
    downloadsKey,
    offlineStoreVersion,
  ]);
};
