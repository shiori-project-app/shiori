import { anilistQuery } from '@/api/clients/anilistClient';
import {
  HOME_LISTS_QUERY,
  LIST_QUERY,
  RECOMMENDATIONS_QUERY,
  SCHEDULE_QUERY,
  SUGGESTIONS_QUERY,
  TRENDS_QUERY,
} from '@/api/queries/anilistQueries';
import { allCachedSeries, getCachedSeries, loadSeries, rememberMedia } from '@/api/services/seriesRegistry';
import { ANILIST_KEEP_FOR_MS, PAGE_SIZE } from '@/config/api.config';
import { TOP_TRENDING_COUNT } from '@/config/app.config';
import { DATE_SORTS, LIST_FORMATS, MIN_POPULARITY, RELEASED_STATUSES } from '@/constants/filters';
import { randomItem, uniqueBy } from '@/utils/arrays';
import { excludedGenres, isFilteredOut, NO_CONTENT_FILTER } from '@/utils/contentFilter';
import { seasonStartDate } from '@/utils/season';

const MULTI_PAGE_SIZE = 50;
const SEASON_MAX_PAGES = 6;
const CONTINUING_MAX_PAGES = 2;
const SCHEDULE_MAX_PAGES = 5;
const DAY_SECONDS = 24 * 60 * 60;
const TREND_WINDOW_SECONDS = 6 * 3600;
const MILLISECONDS_PER_SECOND = 1000;
const SPARE_TRENDING_TITLES = 10;
const TREND_SNAPSHOT_DAYS_AGO = { day: [0], week: [0, 2, 4, 6], month: [0, 5, 10, 15, 20, 25] };
const RANDOM_POOL_MIN_SIZE = 10;
const RANDOM_POPULAR_PAGES = 5;

const isVisibleWith = (contentFilter) => (series) => !isFilteredOut(series, contentFilter);

const fetchAnimeList = async (variables, contentFilter = NO_CONTENT_FILTER) => {
  const data = await anilistQuery(
    LIST_QUERY,
    {
      page: 1,
      per: PAGE_SIZE,
      formats: LIST_FORMATS,
      statuses: RELEASED_STATUSES,
      excludedGenres: excludedGenres(contentFilter),
      ...variables,
    },
    { keepForMs: ANILIST_KEEP_FOR_MS.lists },
  );

  return { items: data.Page.media.map(rememberMedia), pageInfo: data.Page.pageInfo };
};

export const fetchAiringTrending = async (contentFilter) =>
  (await fetchAnimeList({ sort: ['TRENDING_DESC'], statuses: ['RELEASING'] }, contentFilter)).items;

export const fetchHomeLists = async (contentFilter) => {
  const data = await anilistQuery(
    HOME_LISTS_QUERY,
    {
      formats: LIST_FORMATS,
      minPopularity: MIN_POPULARITY,
      excludedGenres: excludedGenres(contentFilter),
    },
    { keepForMs: ANILIST_KEEP_FOR_MS.lists },
  );

  return Object.fromEntries(Object.entries(data).map(([listName, page]) => [listName, page.media.map(rememberMedia)]));
};

const browseStatuses = (status, search) => {
  if (status !== 'ANY') return [status];

  return search ? undefined : RELEASED_STATUSES;
};

export const browseAnime = ({ search, genre, sort, format, status, season, year, page }, contentFilter) =>
  fetchAnimeList(
    {
      page,
      search: search || undefined,
      sort: [sort],
      genre: genre === 'All' ? undefined : genre,
      formats: format === 'ANY' ? LIST_FORMATS : [format],
      statuses: browseStatuses(status, search),
      season: season === 'ANY' ? undefined : season,
      year: year || undefined,
      minPopularity: DATE_SORTS.includes(sort) ? MIN_POPULARITY : undefined,
    },
    contentFilter,
  );

export const fetchTrending = (page, contentFilter) => fetchAnimeList({ page, sort: ['TRENDING_DESC'] }, contentFilter);

const fetchPages = async (variables, maxPages, contentFilter, page = 1) => {
  const { items, pageInfo } = await fetchAnimeList({ ...variables, page, per: MULTI_PAGE_SIZE }, contentFilter);

  if (!pageInfo.hasNextPage || page >= maxPages) return items;

  const laterItems = await fetchPages(variables, maxPages, contentFilter, page + 1);

  return uniqueBy([...items, ...laterItems], (series) => series.id);
};

export const fetchSeason = (season, year, contentFilter) =>
  fetchPages({ season, year, sort: ['POPULARITY_DESC'], statuses: undefined }, SEASON_MAX_PAGES, contentFilter);

export const fetchContinuing = async (season, year, contentFilter) => {
  const startedBefore = seasonStartDate({ season, year });
  const sharedVariables = { sort: ['POPULARITY_DESC'], startedBefore };

  const [stillAiring, endedSinceSeasonStart] = await Promise.all([
    fetchPages({ ...sharedVariables, statuses: ['RELEASING'] }, CONTINUING_MAX_PAGES, contentFilter),

    fetchPages(
      { ...sharedVariables, statuses: ['FINISHED'], endedAfter: startedBefore },
      CONTINUING_MAX_PAGES,
      contentFilter,
    ),
  ]);

  return uniqueBy([...stillAiring, ...endedSinceSeasonStart], (series) => series.id).sort(
    (first, second) => second.popularity - first.popularity,
  );
};

const currentTrendWindowEnd = () =>
  Math.floor(Date.now() / (TREND_WINDOW_SECONDS * MILLISECONDS_PER_SECOND)) * TREND_WINDOW_SECONDS;

const fetchTrendSnapshot = (snapshotEnd) =>
  anilistQuery(
    TRENDS_QUERY,
    { from: snapshotEnd - DAY_SECONDS, to: snapshotEnd },
    { keepForMs: ANILIST_KEEP_FOR_MS.trends },
  );

const isListableAnime = (media) => media?.type === 'ANIME' && !media.isAdult;

const trendingTotalsById = (snapshots) =>
  snapshots
    .flatMap((snapshot) => snapshot.Page.mediaTrends)
    .filter((trend) => isListableAnime(trend.media))
    .reduce((totals, { mediaId, trending }) => totals.set(mediaId, (totals.get(mediaId) ?? 0) + trending), new Map());

export const fetchTopTrending = async (period, contentFilter, count = TOP_TRENDING_COUNT) => {
  const now = currentTrendWindowEnd();

  const snapshots = await Promise.all(
    TREND_SNAPSHOT_DAYS_AGO[period].map((daysAgo) => fetchTrendSnapshot(now - daysAgo * DAY_SECONDS)),
  );

  const rankedIds = [...trendingTotalsById(snapshots)]
    .sort((first, second) => second[1] - first[1])
    .map(([seriesId]) => seriesId);

  await loadSeries(rankedIds.slice(0, count + SPARE_TRENDING_TITLES));

  return rankedIds
    .map(getCachedSeries)
    .filter((series) => series && isVisibleWith(contentFilter)(series))
    .slice(0, count);
};

const isAdultMedia = (media) => media.isAdult || media.genres?.includes('Hentai');

export const fetchSchedule = async (fromSeconds, toSeconds, contentFilter, page = 1) => {
  const data = await anilistQuery(
    SCHEDULE_QUERY,
    { from: fromSeconds, to: toSeconds, page },
    { keepForMs: ANILIST_KEEP_FOR_MS.schedule },
  );

  const airings = data.Page.airingSchedules
    .filter(({ media }) => !isAdultMedia(media))
    .map(({ id, episode, airingAt, media }) => ({ id, episode, airingAt, series: rememberMedia(media) }))
    .filter(({ series }) => isVisibleWith(contentFilter)(series));

  if (!data.Page.pageInfo.hasNextPage || page >= SCHEDULE_MAX_PAGES) return airings;

  const laterAirings = await fetchSchedule(fromSeconds, toSeconds, contentFilter, page + 1);

  return uniqueBy([...airings, ...laterAirings], (airing) => airing.id);
};

export const fetchRecommendations = async (seriesId, contentFilter) => {
  const data = await anilistQuery(
    RECOMMENDATIONS_QUERY,
    { id: seriesId },
    { keepForMs: ANILIST_KEEP_FOR_MS.recommendations },
  );

  return data.Media.recommendations.nodes
    .map((node) => node.mediaRecommendation)
    .filter(Boolean)
    .map(rememberMedia)
    .filter(isVisibleWith(contentFilter));
};

export const fetchSuggestions = async (search, contentFilter) => {
  const data = await anilistQuery(SUGGESTIONS_QUERY, { search, excludedGenres: excludedGenres(contentFilter) });

  return [...new Set(data.Page.media.map((media) => media.title.english || media.title.romaji))];
};

const randomPopularPage = () => 1 + Math.floor(Math.random() * RANDOM_POPULAR_PAGES);

export const fetchRandomSeries = async (contentFilter) => {
  const cachedPool = allCachedSeries().filter(isVisibleWith(contentFilter));

  if (cachedPool.length >= RANDOM_POOL_MIN_SIZE) return randomItem(cachedPool);

  const { items } = await fetchAnimeList({ sort: ['POPULARITY_DESC'], page: randomPopularPage() }, contentFilter);

  return randomItem(items);
};
