import { useCallback } from 'react';
import { useDownloads } from '@/hooks/useDownloads';
import { useLocalEpisodes } from '@/hooks/useLocalEpisodes';
import { isPending } from '@shared/downloadStates';

const EPISODE_AVAILABILITY = { ready: 'ready', downloading: 'downloading', missing: 'missing' };

export const useEpisodeAvailability = (series) => {
  const localEpisodeFiles = useLocalEpisodes(series);
  const { downloads } = useDownloads();

  return useCallback(
    (episodeNumber) => {
      const file = localEpisodeFiles.get(episodeNumber);

      if (file && !file.inProgress) return { state: EPISODE_AVAILABILITY.ready, file };

      const isQueued = downloads.some(
        (download) => download.seriesId === series.id && download.episode === episodeNumber && isPending(download),
      );

      const state = file?.inProgress || isQueued ? EPISODE_AVAILABILITY.downloading : EPISODE_AVAILABILITY.missing;

      return { state, file: file ?? null };
    },
    [localEpisodeFiles, downloads, series.id],
  );
};
