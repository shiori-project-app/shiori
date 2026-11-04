import { anilistQuery } from '@/api/clients/anilistClient';
import { AIRING_SCHEDULE_QUERY, RELATIONS_QUERY } from '@/api/queries/anilistQueries';
import { findSavedEpisodeOffset } from '@/api/services/offlineStore';
import { ANILIST_KEEP_FOR_MS } from '@/config/api.config';
import { sum, takeWhile } from '@/utils/arrays';
import { rememberRequest } from '@/utils/async';
import { seriesSeason } from '@/utils/titles';

const SEASON_FORMATS = ['TV', 'TV_SHORT'];
const ONA_SEASON_MIN_EPISODES = 4;
const MAX_PREQUEL_HOPS = 12;
const MILLISECONDS_PER_SECOND = 1000;

export const isSeasonEntry = (entry) =>
  SEASON_FORMATS.includes(entry.format) || (entry.format === 'ONA' && entry.episodes >= ONA_SEASON_MIN_EPISODES);

const toChainSeason = (seasonEntry) => ({
  episodes: seasonEntry.episodes,
  romajiTitle: seasonEntry.title.romaji,
  title: seasonEntry.title.english || seasonEntry.title.romaji,
});

const walkPrequels = async (seriesId, visitedIds, chain, hopsLeft) => {
  if (!hopsLeft) return chain;

  const data = await anilistQuery(RELATIONS_QUERY, { id: seriesId }, { keepForMs: ANILIST_KEEP_FOR_MS.relations });
  const prequelEdges = data.Media.relations.edges.filter((edge) => edge.relationType === 'PREQUEL');
  const seasonPrequel = prequelEdges.find((edge) => isSeasonEntry(edge.node))?.node;

  const nextEntry = seasonPrequel ?? prequelEdges.find((edge) => !visitedIds.has(edge.node.id))?.node;
  const reachedEnd = !nextEntry || visitedIds.has(nextEntry.id) || (seasonPrequel && !seasonPrequel.episodes);

  if (reachedEnd) return chain;

  const extendedChain = seasonPrequel ? [...chain, toChainSeason(seasonPrequel)] : chain;

  return walkPrequels(nextEntry.id, new Set([...visitedIds, nextEntry.id]), extendedChain, hopsLeft - 1);
};

const prequelChainRequests = new Map();

const fetchPrequelChain = (seriesId) =>
  rememberRequest(prequelChainRequests, seriesId, () =>
    walkPrequels(seriesId, new Set([seriesId]), [], MAX_PREQUEL_HOPS),
  );

const totalEpisodes = (seasons) => sum(seasons.map((season) => season.episodes));

export const fetchKnownEpisodeOffset = (seriesId) =>
  fetchPrequelChain(seriesId).then(totalEpisodes, () => findSavedEpisodeOffset(seriesId));

export const fetchEpisodeOffset = async (seriesId) => (await fetchKnownEpisodeOffset(seriesId)) ?? 0;

const airingScheduleByEpisode = (airing) =>
  Object.fromEntries(
    (airing?.Media.airingSchedule.nodes ?? []).map((node) => [node.episode, node.airingAt * MILLISECONDS_PER_SECOND]),
  );

export const fetchSeasonContext = async (series) => {
  const [prequelChain, airing] = await Promise.all([
    fetchPrequelChain(series.id).catch(() => []),

    anilistQuery(AIRING_SCHEDULE_QUERY, { id: series.id }, { keepForMs: ANILIST_KEEP_FOR_MS.airingSchedule }).catch(
      () => null,
    ),
  ]);

  const season = seriesSeason(series);
  const earlierPartsOfSameSeason = takeWhile(prequelChain, (earlierSeason) => seriesSeason(earlierSeason) === season);

  return {
    offset: totalEpisodes(prequelChain),
    sameSeasonOffset: totalEpisodes(earlierPartsOfSameSeason),
    firstSeason: prequelChain.at(-1) ?? null,
    schedule: airingScheduleByEpisode(airing),
  };
};

export const forgetPrequelChains = () => prequelChainRequests.clear();
