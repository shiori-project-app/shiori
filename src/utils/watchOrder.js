import { watchedCount } from '@/utils/watched';

const FRANCHISE_RELATIONS = ['PREQUEL', 'SEQUEL', 'PARENT', 'SIDE_STORY', 'SUMMARY'];

const STORY_RELATIONS = ['PREQUEL', 'SEQUEL'];

const INVERSE_RELATIONS = { PREQUEL: 'SEQUEL', SEQUEL: 'PREQUEL', SIDE_STORY: 'PARENT', SUMMARY: 'PARENT' };

export const isFranchiseEdge = (edge) =>
  edge.node?.type === 'ANIME' && edge.node.format !== 'MUSIC' && FRANCHISE_RELATIONS.includes(edge.relationType);

export const RELATION_LABELS = { SIDE_STORY: 'Side story', SUMMARY: 'Recap' };

const isStoryRelation = (relation) => STORY_RELATIONS.includes(relation.type);

const collectStoryChain = (relationsOf, rootId) => {
  const visit = (chain, seriesId) =>
    relationsOf(seriesId)
      .filter(isStoryRelation)
      .reduce(
        (grownChain, relation) =>
          grownChain.has(relation.id) ? grownChain : visit(grownChain.add(relation.id), relation.id),
        chain,
      );

  return visit(new Set([rootId]), rootId);
};

const firstConnectionTypeById = (graph) =>
  new Map(
    [...graph.values()]
      .flat()
      .filter((relation) => RELATION_LABELS[relation.type])
      .reverse()
      .map((relation) => [relation.id, relation.type]),
  );

const withInverseRelations = (graph) =>
  [...graph].reduce(
    (relationsById, [seriesId, relations]) => {
      relations
        .filter((relation) => INVERSE_RELATIONS[relation.type])
        .forEach((relation) =>
          relationsById.set(relation.id, [
            ...(relationsById.get(relation.id) ?? []),
            { type: INVERSE_RELATIONS[relation.type], id: seriesId },
          ]),
        );

      return relationsById;
    },
    new Map([...graph].map(([seriesId, relations]) => [seriesId, [...relations]])),
  );

const storyRootId = (relationsOf, startId) => {
  const startRelations = relationsOf(startId);

  if (startRelations.some(isStoryRelation)) return startId;

  return startRelations.find((relation) => relation.type === 'PARENT')?.id ?? startId;
};

export const orderFranchise = (graph, startId, releaseKey) => {
  const relationsInBothDirections = withInverseRelations(graph);

  const relationsOf = (seriesId) => relationsInBothDirections.get(seriesId) ?? [];

  const mainStory = collectStoryChain(relationsOf, storyRootId(relationsOf, startId));
  const connectionTypes = firstConnectionTypeById(graph);

  return [...graph.keys()]
    .sort((first, second) => releaseKey(first) - releaseKey(second) || first - second)
    .map((seriesId) => {
      const isMainStory = mainStory.has(seriesId);

      return {
        id: seriesId,
        main: isMainStory,
        relation: isMainStory ? null : (connectionTypes.get(seriesId) ?? null),
      };
    });
};

export const seriesWatchProgress = (series, list, watched) => {
  const watchedEpisodes = watchedCount(watched, series.id);
  const hasWatchedEveryEpisode = series.totalEpisodes > 0 && watchedEpisodes >= series.totalEpisodes;
  const isCompleted = list[series.id]?.status === 'completed' || hasWatchedEveryEpisode;

  return { watchedEpisodes, totalEpisodes: series.totalEpisodes ?? series.released, isCompleted };
};

const ENTRIES_SHOWN_AFTER_CURRENT = 1;

export const collapsedWindow = (entryCount, currentIndex, windowSize) => {
  const lastStart = Math.max(0, entryCount - windowSize);
  const startKeepingCurrentVisible = currentIndex + ENTRIES_SHOWN_AFTER_CURRENT + 1 - windowSize;
  const start = Math.min(lastStart, Math.max(0, startKeepingCurrentVisible));

  return { start, end: Math.min(entryCount, start + windowSize) };
};
