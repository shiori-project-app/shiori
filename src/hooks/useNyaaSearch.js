import { useEffect, useMemo, useState } from 'react';
import { fetchSeasonContext } from '@/api/services/seasonService';
import { episodeQueries, matchesPreferences, searchTorrents, seasonQueries } from '@/api/services/torrentService';
import { useAsync } from '@/hooks/useAsync';
import { useTorrentPreferences } from '@/hooks/useTorrentPreferences';
import { releaseEpisodes } from '@/utils/releaseEpisodes';

const NEVER_RESOLVES = new Promise(() => {});
const UNKNOWN_SEASON_CONTEXT = {};

export const useNyaaSearch = (series, episode) => {
  const seasonContext = useAsync(() => fetchSeasonContext(series), [series.id]);

  const context = seasonContext.data ?? UNKNOWN_SEASON_CONTEXT;
  const isNumberingKnown = !episode || !seasonContext.loading;
  const automaticQueryGroups = episode ? episodeQueries(series, episode, context) : seasonQueries(series);

  const [manualQuery, setManualQuery] = useState(null);
  const [searchInput, setSearchInput] = useState(automaticQueryGroups[0][0]);
  const [trustedOnly, setTrustedOnly] = useState(false);
  const [showOtherEpisodes, setShowOtherEpisodes] = useState(false);

  const [torrentPreferences, setTorrentPreferences] = useTorrentPreferences();

  const search = useAsync(
    () =>
      isNumberingKnown
        ? searchTorrents(manualQuery ? [[manualQuery]] : automaticQueryGroups, { trustedOnly })
        : NEVER_RESOLVES,
    [manualQuery, trustedOnly, isNumberingKnown],
  );

  useEffect(() => {
    if (search.data) setSearchInput(search.data.query);
  }, [search.data]);

  const foundTorrents = search.data?.items;

  const episodeByTorrentId = useMemo(
    () => releaseEpisodes(series, foundTorrents ?? [], context),
    [series, foundTorrents, context],
  );

  const episodeOf = (torrent) => episodeByTorrentId.get(torrent.id) ?? null;

  const preferredTorrents = (foundTorrents ?? []).filter((torrent) => matchesPreferences(torrent, torrentPreferences));

  const visibleTorrents =
    episode && !showOtherEpisodes
      ? preferredTorrents.filter((torrent) => episodeOf(torrent) === episode)
      : preferredTorrents;

  const submitSearch = () => {
    const trimmedInput = searchInput.trim();

    if (trimmedInput) setManualQuery(trimmedInput);
  };

  return {
    search,
    searchInput,
    setSearchInput,
    submitSearch,
    trustedOnly,
    toggleTrustedOnly: () => setTrustedOnly((isOn) => !isOn),
    torrentPreferences,
    setTorrentPreferences,
    preferredTorrents,
    visibleTorrents,
    hiddenCount: preferredTorrents.length - visibleTorrents.length,
    showOtherEpisodes: () => setShowOtherEpisodes(true),
    episodeOf,
  };
};
