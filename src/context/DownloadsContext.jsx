import { createContext, useEffect, useMemo, useState } from 'react';
import {
  addDownloads,
  cancelDownload,
  clearFinishedDownloads,
  listDownloads,
  moveDownload,
  onDownloadsChanged,
  pauseAllDownloads,
  pauseDownload,
  removeDownload,
  resumeAllDownloads,
  resumeDownload,
  retryDownload,
  showDownload,
} from '@/api/clients/desktopClient';
import { resolveDownloadUrl } from '@/api/services/animeHeavenService';
import { mapSequentially } from '@/utils/async';
import { episodeFileName } from '@/utils/downloads';

export const DownloadsContext = createContext(null);

export const LiveDownloadsContext = createContext([]);

const withoutProgress = ({ id, seriesId, episode, state }) => ({ id, seriesId, episode, state });

const buildQueueItem = async (series, animeHeavenEpisode) => ({
  id: crypto.randomUUID(),
  seriesId: series.id,
  episode: animeHeavenEpisode.episodeNumber,
  episodeKey: animeHeavenEpisode.key,
  label: `${series.title} · Episode ${animeHeavenEpisode.episodeNumber}`,
  url: await resolveDownloadUrl(animeHeavenEpisode.key),
  folder: series.title,
  fileName: episodeFileName(series, animeHeavenEpisode.episodeNumber),
});

const buildQueueItemOrNull = (series, animeHeavenEpisode) =>
  buildQueueItem(series, animeHeavenEpisode).catch(() => null);

const freshDownloadUrl = async (download) => {
  if (!download.episodeKey) return undefined;

  return resolveDownloadUrl(download.episodeKey).catch(() => undefined);
};

const queueEpisodes = async (series, animeHeavenEpisodes, onProgress) => {
  const builtItems = await mapSequentially(animeHeavenEpisodes, (animeHeavenEpisode, index) => {
    onProgress?.(index, animeHeavenEpisodes.length);

    return buildQueueItemOrNull(series, animeHeavenEpisode);
  });

  onProgress?.(animeHeavenEpisodes.length, animeHeavenEpisodes.length);

  const queueItems = builtItems.filter(Boolean);

  const { added, rejectedEpisodes } = queueItems.length
    ? await addDownloads(queueItems)
    : { added: 0, rejectedEpisodes: [] };

  return {
    added,
    failed: builtItems.length - queueItems.length + rejectedEpisodes.length,
    queued: queueItems.map((queueItem) => queueItem.episode).filter((episode) => !rejectedEpisodes.includes(episode)),
  };
};

const DOWNLOAD_ACTIONS = {
  queueEpisodes,
  retry: async (download) => retryDownload(download.id, await freshDownloadUrl(download)),
  pause: pauseDownload,
  resume: resumeDownload,
  pauseAll: pauseAllDownloads,
  resumeAll: resumeAllDownloads,
  cancel: cancelDownload,
  move: moveDownload,
  remove: removeDownload,
  clearFinished: clearFinishedDownloads,
  showInFolder: (download) => showDownload(download.savePath),
};

export const DownloadsProvider = ({ children }) => {
  const [liveDownloads, setLiveDownloads] = useState([]);

  useEffect(() => {
    if (!window.shiori) return;

    let isMounted = true;

    listDownloads().then((queue) => isMounted && setLiveDownloads(queue));

    const unsubscribe = onDownloadsChanged(setLiveDownloads);

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const queueWithoutProgress = JSON.stringify(liveDownloads.map(withoutProgress));

  const value = useMemo(
    () => ({ downloads: JSON.parse(queueWithoutProgress), ...DOWNLOAD_ACTIONS }),
    [queueWithoutProgress],
  );

  return (
    <DownloadsContext value={value}>
      <LiveDownloadsContext value={liveDownloads}>{children}</LiveDownloadsContext>
    </DownloadsContext>
  );
};
