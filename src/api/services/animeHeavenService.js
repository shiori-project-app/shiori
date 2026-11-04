import { fetchText } from '@/api/clients/desktopClient';
import { parseDownloadUrl, parseEpisodes, parseSearchResults } from '@/api/mappers/animeHeavenMapper';
import { ANIMEHEAVEN_URL } from '@/config/api.config';
import { findSequentially } from '@/utils/async';
import { normalizeTitle, seasonNumber, straightQuotes, withoutSeason } from '@/utils/titles';

const MIN_QUERY_LENGTH = 2;
const NOT_FOUND = -1;

export const searchShows = async (query) =>
  parseSearchResults(await fetchText(`${ANIMEHEAVEN_URL}/search.php?${new URLSearchParams({ s: query })}`));

const mainNameBeforeColon = (title) => title.split(':')[0];

const showQueries = (series) => {
  const titles = [series.title, series.romajiTitle].filter(Boolean).map(straightQuotes);

  return [...new Set([...titles, ...titles.map(withoutSeason), ...titles.map(mainNameBeforeColon)])].filter(
    (query) => query.trim().length >= MIN_QUERY_LENGTH,
  );
};

const bestMatchIndex = (series, shows) => {
  const wantedTitles = [series.title, series.romajiTitle].filter(Boolean).map(normalizeTitle);
  const exactMatchIndex = shows.findIndex((show) => wantedTitles.includes(normalizeTitle(show.title)));

  if (exactMatchIndex !== NOT_FOUND) return exactMatchIndex;

  const season = seasonNumber(series.title || series.romajiTitle);

  return Math.max(
    0,
    shows.findIndex((show) => seasonNumber(show.title) === season),
  );
};

export const findShows = async (series) => {
  const queries = showQueries(series);

  const firstMatch = await findSequentially(queries, async (query) => {
    const shows = await searchShows(query);

    return shows.length ? { query, shows, bestIndex: bestMatchIndex(series, shows) } : null;
  });

  return firstMatch ?? { query: queries[0], shows: [], bestIndex: 0 };
};

export const fetchEpisodes = async (showCode) =>
  parseEpisodes(await fetchText(`${ANIMEHEAVEN_URL}/anime.php?${showCode}`));

export const resolveDownloadUrl = async (episodeKey) => {
  const downloadUrl = parseDownloadUrl(await fetchText(`${ANIMEHEAVEN_URL}/gate.php`, `key=${episodeKey}`));

  if (!downloadUrl) throw new Error('AnimeHeaven didn’t return a download link for this episode.');

  return downloadUrl;
};
