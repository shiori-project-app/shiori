export const isWatched = (watched, seriesId, episodeNumber) => watched[seriesId]?.includes(episodeNumber) ?? false;

export const watchedCount = (watched, seriesId) => watched[seriesId]?.length ?? 0;

export const furthestWatchedEpisode = (watched, seriesId) => Math.max(0, ...(watched[seriesId] ?? []));

export const firstEpisodes = (count) => Array.from({ length: Math.max(0, count) }, (_, index) => index + 1);

export const mergeEpisodes = (firstList = [], secondList = []) =>
  [...new Set([...firstList, ...secondList])].sort((first, second) => first - second);
