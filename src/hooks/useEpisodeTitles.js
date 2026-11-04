import { useEffect, useState } from 'react';
import { fetchEpisodeTitles } from '@/api/services/episodeService';

export const useEpisodeTitles = (series, firstEpisode, lastEpisode) => {
  const [episodeTitles, setEpisodeTitles] = useState({});

  useEffect(() => {
    let isLatestRequest = true;

    fetchEpisodeTitles(series, firstEpisode, lastEpisode).then(
      (loadedTitles) => isLatestRequest && setEpisodeTitles(loadedTitles),
    );

    return () => {
      isLatestRequest = false;
    };
  }, [series, firstEpisode, lastEpisode]);

  return episodeTitles;
};
