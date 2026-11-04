import { useEffect, useState } from 'react';
import { fetchEpisodes, findShows, searchShows } from '@/api/services/animeHeavenService';
import { useAsync } from '@/hooks/useAsync';

const searchByQuery = (query) => searchShows(query).then((shows) => ({ query, shows, bestIndex: 0 }));

export const useAnimeHeavenShow = (series) => {
  const [manualQuery, setManualQuery] = useState(null);
  const [searchInput, setSearchInput] = useState(series.title);
  const [pickedShowCode, setPickedShowCode] = useState(null);

  const foundShows = useAsync(
    () => (manualQuery ? searchByQuery(manualQuery) : findShows(series)),
    [manualQuery, series.id],
  );

  const shows = foundShows.data?.shows ?? [];
  const selectedShowCode = pickedShowCode ?? shows[foundShows.data?.bestIndex]?.code ?? '';
  const selectedShow = shows.find((show) => show.code === selectedShowCode) ?? null;

  const episodes = useAsync(
    () => (selectedShowCode ? fetchEpisodes(selectedShowCode) : Promise.resolve([])),
    [selectedShowCode],
  );

  useEffect(() => {
    if (foundShows.data) setSearchInput(foundShows.data.query);
  }, [foundShows.data]);

  const search = () => {
    const trimmedInput = searchInput.trim();

    if (!trimmedInput) return;

    setPickedShowCode(null);
    setManualQuery(trimmedInput);
  };

  return {
    searchInput,
    setSearchInput,
    search,
    foundShows,
    shows,
    selectedShow,
    pickShow: setPickedShowCode,
    episodes,
  };
};
