import { useContext, useEffect, useMemo } from 'react';
import { markSeriesWithLocalFiles } from '@/api/services/offlineStore';
import { fetchEpisodeOffset } from '@/api/services/seasonService';
import { LocalFilesContext } from '@/context/LocalFilesContext';
import { useAsync } from '@/hooks/useAsync';
import { useLibrary } from '@/hooks/useLibrary';
import { hasFilesNamingSeries } from '@/utils/episodeFiles';
import { linksOfSeries, matchLinkedSeriesFiles } from '@/utils/fileLinks';

const NO_OFFSET = 0;

export const useLocalEpisodes = (series) => {
  const { root, files } = useContext(LocalFilesContext);
  const { fileLinks } = useLibrary();
  const links = useMemo(() => linksOfSeries(fileLinks, series.id), [fileLinks, series.id]);

  const hasCandidateFiles = useMemo(
    () => links.folders.length > 0 || hasFilesNamingSeries(series, files),
    [links.folders.length, series, files],
  );

  const earlierSeasonsEpisodeCount =
    useAsync(
      () => (hasCandidateFiles ? fetchEpisodeOffset(series.id) : Promise.resolve(NO_OFFSET)),
      [series.id, hasCandidateFiles],
    ).data ?? NO_OFFSET;

  const localEpisodeFiles = useMemo(
    () => matchLinkedSeriesFiles(series, files, earlierSeasonsEpisodeCount, links, root),
    [series, files, earlierSeasonsEpisodeCount, links, root],
  );

  useEffect(() => {
    if (localEpisodeFiles.size) markSeriesWithLocalFiles(series.id);
  }, [localEpisodeFiles, series.id]);

  return localEpisodeFiles;
};
