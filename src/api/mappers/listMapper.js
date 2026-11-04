const ANILIST_STATUSES = {
  CURRENT: 'watching',
  REPEATING: 'watching',
  PLANNING: 'planning',
  COMPLETED: 'completed',
  PAUSED: 'paused',
  DROPPED: 'dropped',
};

const MAL_STATUSES = { 1: 'watching', 2: 'completed', 3: 'paused', 4: 'dropped', 6: 'planning' };

const FALLBACK_STATUS = 'planning';

export const fromAniListStatus = (status) => ANILIST_STATUSES[status] ?? FALLBACK_STATUS;

export const fromMalStatus = (status) => MAL_STATUSES[status] ?? FALLBACK_STATUS;

export const uniqueEntries = (entries) => [
  ...entries
    .reduce((entryBySeries, entry) => {
      const existingEntry = entryBySeries.get(entry.seriesId);

      return !existingEntry || entry.progress > existingEntry.progress
        ? entryBySeries.set(entry.seriesId, entry)
        : entryBySeries;
    }, new Map())
    .values(),
];
