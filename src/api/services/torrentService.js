import { fetchText, getTorrentApp, openMagnet } from '@/api/clients/desktopClient';
import { parseNyaaRss } from '@/api/mappers/nyaaMapper';
import { fetchSeasonContext } from '@/api/services/seasonService';
import { NYAA_URL } from '@/config/api.config';
import { findSequentially } from '@/utils/async';
import { twoDigits } from '@/utils/format';
import { releaseEpisodes } from '@/utils/releaseEpisodes';
import { releaseTitleVariants, seriesSeason, seriesTitles } from '@/utils/titles';

const NYAA_ENGLISH_TRANSLATED_CATEGORY = '1_2';
const NYAA_TRUSTED_ONLY_FILTER = '2';
const NYAA_NO_FILTER = '0';

const searchNyaa = (query, trustedOnly) =>
  fetchText(
    `${NYAA_URL}/?${new URLSearchParams({
      page: 'rss',
      q: query,
      c: NYAA_ENGLISH_TRANSLATED_CATEGORY,
      f: trustedOnly ? NYAA_TRUSTED_ONLY_FILTER : NYAA_NO_FILTER,
    })}`,
  );

const numberedQueries = (titles, episodeNumber) => titles.map((title) => `${title} ${twoDigits(episodeNumber)}`);

const seasonEpisodeQueries = (titleVariants, season, episodeNumber) => {
  const seasonSuffix = ` S${season}`;

  return season > 1
    ? titleVariants
        .filter((title) => title.endsWith(seasonSuffix))
        .map((title) => `${title.slice(0, -seasonSuffix.length)} S${twoDigits(season)}E${twoDigits(episodeNumber)}`)
    : [];
};

const offsetAndOneLower = (offset) => (offset > 0 ? [offset, offset - 1] : []);

export const episodeQueries = (
  series,
  episodeNumber,
  { offset = 0, sameSeasonOffset = 0, firstSeason = null } = {},
) => {
  const titleVariants = releaseTitleVariants(series);

  const queries = [
    ...numberedQueries(titleVariants, episodeNumber),
    ...seasonEpisodeQueries(titleVariants, seriesSeason(series), episodeNumber),
    ...offsetAndOneLower(sameSeasonOffset).flatMap((shift) => numberedQueries(titleVariants, episodeNumber + shift)),

    ...(firstSeason
      ? offsetAndOneLower(offset).flatMap((shift) => numberedQueries(seriesTitles(firstSeason), episodeNumber + shift))
      : []),
  ];

  return [[...new Set(queries)]];
};

export const seasonQueries = (series) => {
  const titleVariants = releaseTitleVariants(series);

  return [titleVariants.map((title) => `${title} batch`), titleVariants];
};

export const plainWords = (text) =>
  text
    .replace(/[|()"+*~:]/g, ' ')
    .replace(/(^|\s)-+|-+(?=\s|$)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const anyOf = (queries) =>
  queries.length === 1 ? queries[0] : queries.map((query) => `(${plainWords(query)})`).join('|');

const bySeedersDescending = (first, second) => second.seeders - first.seeders;

export const searchTorrents = async (queryGroups, { trustedOnly = false } = {}) => {
  const firstGroupWithResults = await findSequentially(queryGroups, async (queries) => {
    const torrents = parseNyaaRss(await searchNyaa(anyOf(queries), trustedOnly));

    return torrents.length ? { query: queries[0], items: torrents.sort(bySeedersDescending) } : null;
  });

  return firstGroupWithResults ?? { query: queryGroups[0][0], items: [] };
};

export const openMagnetInTorrentApp = (magnet, series) => openMagnet(magnet, series.title);

const isDualAudio = (title) => /dual[\s-]?audio|\bdub(bed)?\b|multi[\s-]?audio/i.test(title);

export const matchesPreferences = (torrent, { resolution = 'any', audio = 'any' }) =>
  (resolution === 'any' || torrent.resolution === resolution) && (audio !== 'dub' || isDualAudio(torrent.title));

const byTrustThenSeeders = (first, second) => second.trusted - first.trusted || second.seeders - first.seeders;

export const findEpisodeTorrent = async (series, episodeNumber, preferences) => {
  const seasonContext = await fetchSeasonContext(series);
  const { items: torrents } = await searchTorrents(episodeQueries(series, episodeNumber, seasonContext));
  const episodeByTorrentId = releaseEpisodes(series, torrents, seasonContext);

  return (
    torrents
      .filter(
        (torrent) => episodeByTorrentId.get(torrent.id) === episodeNumber && matchesPreferences(torrent, preferences),
      )
      .sort(byTrustThenSeeders)[0] ?? null
  );
};

export { getTorrentApp };
