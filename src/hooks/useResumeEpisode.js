import { useMemo } from 'react';
import { useLibrary, usePlaybackProgress } from '@/hooks/useLibrary';
import { episodeId, parseEpisodeId } from '@/utils/episodes';
import { furthestWatchedEpisode, isWatched } from '@/utils/watched';

const FIRST_EPISODE = 1;

export const useResumeEpisode = (series) => {
  const { history, watched } = useLibrary();
  const progress = usePlaybackProgress();

  return useMemo(() => {
    const lastOpenedEpisode = history
      .map(parseEpisodeId)
      .find((entry) => entry.seriesId === series.id && entry.episodeNumber <= series.released)?.episodeNumber;

    const furthestWatched = furthestWatchedEpisode(watched, series.id);

    const episodeAfterFurthestWatched =
      furthestWatched > 0 && furthestWatched < series.released ? furthestWatched + 1 : null;

    const hasFinishedLastOpened =
      lastOpenedEpisode != null &&
      isWatched(watched, series.id, lastOpenedEpisode) &&
      progress[episodeId(series.id, lastOpenedEpisode)] == null &&
      lastOpenedEpisode < series.released;

    const episodeToContinue = hasFinishedLastOpened ? lastOpenedEpisode + 1 : lastOpenedEpisode;
    const resumeEpisode = episodeToContinue ?? episodeAfterFurthestWatched ?? FIRST_EPISODE;

    const hasStarted = Boolean(lastOpenedEpisode ?? episodeAfterFurthestWatched);

    return { resumeEpisode, hasStarted };
  }, [history, watched, progress, series.id, series.released]);
};
