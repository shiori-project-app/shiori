import { anilistQuery } from '@/api/clients/anilistClient';
import { fetchText } from '@/api/clients/desktopClient';
import { fromAniListStatus, fromMalStatus, uniqueEntries } from '@/api/mappers/listMapper';
import { USER_LIST_QUERY } from '@/api/queries/anilistQueries';
import { fetchSeriesByMalIds } from '@/api/services/seriesRegistry';
import { MAL_LIST_PAGE_SIZE, MAL_URL } from '@/config/api.config';

const MAL_ALL_STATUSES = 7;

export const fetchAniListEntries = async (userName, onProgress) => {
  onProgress?.('Loading your AniList list…');

  const data = await anilistQuery(USER_LIST_QUERY, { user: userName }, { cache: false });

  if (!data.MediaListCollection) {
    throw new Error('Couldn’t read that AniList list. Check the username and that the profile is public.');
  }

  const entries = data.MediaListCollection.lists
    .flatMap((list) => list.entries)
    .map((listEntry) => ({
      seriesId: listEntry.media.id,
      status: fromAniListStatus(listEntry.status),
      progress: listEntry.progress ?? 0,
    }));

  return { entries: uniqueEntries(entries), unmatched: 0 };
};

const fetchMalPage = async (userName, offset) => {
  try {
    const pageUrl = `${MAL_URL}/animelist/${encodeURIComponent(userName)}/load.json?status=${MAL_ALL_STATUSES}&offset=${offset}`;

    return JSON.parse(await fetchText(pageUrl));
  } catch {
    throw new Error('Couldn’t load that MyAnimeList list. Check the username and that the list is public.');
  }
};

const fetchAllMalItems = async (userName, onProgress, loadedItems = []) => {
  onProgress?.(`Loading your MyAnimeList list… ${loadedItems.length} shows so far`);

  const page = await fetchMalPage(userName, loadedItems.length);

  if (!Array.isArray(page)) throw new Error('MyAnimeList returned something unexpected.');

  const allItems = [...loadedItems, ...page];

  return page.length < MAL_LIST_PAGE_SIZE ? allItems : fetchAllMalItems(userName, onProgress, allItems);
};

export const fetchMalEntries = async (userName, onProgress) => {
  const malItems = await fetchAllMalItems(userName, onProgress);

  onProgress?.(`Matching ${malItems.length} shows with AniList…`);

  const seriesByMalId = await fetchSeriesByMalIds(malItems.map((malItem) => malItem.anime_id));

  const entries = malItems
    .filter((malItem) => seriesByMalId.has(malItem.anime_id))
    .map((malItem) => ({
      seriesId: seriesByMalId.get(malItem.anime_id).id,
      status: fromMalStatus(malItem.status),
      progress: malItem.num_watched_episodes ?? 0,
    }));

  return { entries: uniqueEntries(entries), unmatched: malItems.length - entries.length };
};
