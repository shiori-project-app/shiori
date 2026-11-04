import { anilistQuery } from '@/api/clients/anilistClient';
import { FRANCHISE_QUERY } from '@/api/queries/anilistQueries';
import { getCachedSeries, loadSeries } from '@/api/services/seriesRegistry';
import { ANILIST_KEEP_FOR_MS, ANILIST_MAX_IDS_PER_REQUEST } from '@/config/api.config';
import { chunk } from '@/utils/arrays';
import { mapSequentially, rememberRequest } from '@/utils/async';
import { isFranchiseEdge, orderFranchise } from '@/utils/watchOrder';

const FRANCHISE_MAX_ROUNDS = 6;
const FRANCHISE_MAX_TITLES = 60;

const franchiseGraphRequests = new Map();

const franchiseRelations = (edges) =>
  edges.filter(isFranchiseEdge).map((edge) => ({ type: edge.relationType, id: edge.node.id }));

const crawlFranchise = async (startId) => {
  const relationGraph = new Map();
  const foundIds = new Set([startId]);

  const recordRelations = (seriesId, edges) => {
    const relations = franchiseRelations(edges);

    relationGraph.set(seriesId, relations);

    relations.forEach((relation) => {
      if (foundIds.size < FRANCHISE_MAX_TITLES) foundIds.add(relation.id);
    });
  };

  const recordMediaWithNeighbours = (media) => {
    recordRelations(media.id, media.relations.edges);

    media.relations.edges.forEach((edge) => {
      const isUnvisitedNeighbour =
        foundIds.has(edge.node.id) && !relationGraph.has(edge.node.id) && edge.node.relations;

      if (isUnvisitedNeighbour) recordRelations(edge.node.id, edge.node.relations.edges);
    });
  };

  const crawlChunk = async (idsChunk) => {
    const data = await anilistQuery(FRANCHISE_QUERY, { ids: idsChunk }, { keepForMs: ANILIST_KEEP_FOR_MS.franchise });

    data.Page.media.forEach(recordMediaWithNeighbours);
    idsChunk.filter((seriesId) => !relationGraph.has(seriesId)).forEach((seriesId) => relationGraph.set(seriesId, []));
  };

  const crawlRounds = async (roundsLeft) => {
    const unvisitedIds = [...foundIds].filter((seriesId) => !relationGraph.has(seriesId));

    if (!roundsLeft || !unvisitedIds.length) return;

    await mapSequentially(chunk(unvisitedIds, ANILIST_MAX_IDS_PER_REQUEST), crawlChunk);
    await crawlRounds(roundsLeft - 1);
  };

  await crawlRounds(FRANCHISE_MAX_ROUNDS);

  [...foundIds]
    .filter((seriesId) => !relationGraph.has(seriesId))
    .forEach((seriesId) => relationGraph.set(seriesId, []));

  return relationGraph;
};

const fetchFranchiseGraph = (seriesId) =>
  rememberRequest(franchiseGraphRequests, seriesId, () => {
    const crawlRequest = crawlFranchise(seriesId).then((relationGraph) => {
      [...relationGraph.keys()]
        .filter((franchiseSeriesId) => !franchiseGraphRequests.has(franchiseSeriesId))
        .forEach((franchiseSeriesId) => franchiseGraphRequests.set(franchiseSeriesId, crawlRequest));

      return relationGraph;
    });

    return crawlRequest;
  });

const releaseKeyOf = (seriesId) => getCachedSeries(seriesId)?.releaseKey ?? Number.MAX_SAFE_INTEGER;

export const fetchWatchOrder = async (seriesId) => {
  const relationGraph = await fetchFranchiseGraph(seriesId);

  await loadSeries([...relationGraph.keys()]);

  return orderFranchise(relationGraph, seriesId, releaseKeyOf)
    .map((entry) => ({ ...entry, series: getCachedSeries(entry.id) }))
    .filter((entry) => entry.series);
};

export const forgetWatchOrders = () => franchiseGraphRequests.clear();
