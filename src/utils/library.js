import { firstEpisodes, mergeEpisodes } from '@/utils/watched';

export const withoutKey = (record, keyToRemove) =>
  Object.fromEntries(Object.entries(record).filter(([key]) => key !== String(keyToRemove)));

export const withEpisodeWatched = (watched, seriesId, episodeNumber) =>
  watched[seriesId]?.includes(episodeNumber)
    ? watched
    : { ...watched, [seriesId]: mergeEpisodes(watched[seriesId], [episodeNumber]) };

export const withEpisodeUnwatched = (watched, seriesId, episodeNumber) => {
  if (!watched[seriesId]?.includes(episodeNumber)) return watched;

  const remainingEpisodes = watched[seriesId].filter((watchedEpisode) => watchedEpisode !== episodeNumber);

  return remainingEpisodes.length ? { ...watched, [seriesId]: remainingEpisodes } : withoutKey(watched, seriesId);
};

export const withWatchDateRecorded = (watchDates, watchedEpisodeId, watchedAt) =>
  watchDates[watchedEpisodeId] ? watchDates : { ...watchDates, [watchedEpisodeId]: watchedAt };

export const withWatchDateRemoved = (watchDates, watchedEpisodeId) =>
  watchDates[watchedEpisodeId] ? withoutKey(watchDates, watchedEpisodeId) : watchDates;

const importOutcome = (list, watched, { seriesId, progress: importedProgress }) => {
  if (!list[seriesId]) return 'added';

  const localWatchedCount = watched[seriesId]?.length ?? 0;

  return importedProgress > localWatchedCount ? 'updated' : 'unchanged';
};

export const mergeImportedEntries = (list, watched, entries, now = Date.now()) =>
  entries.reduce(
    (merged, entry) => {
      const outcome = importOutcome(merged.list, merged.watched, entry);
      const summary = { ...merged.summary, [outcome]: merged.summary[outcome] + 1 };

      if (outcome === 'unchanged') return { ...merged, summary };

      const listEntry =
        outcome === 'added'
          ? { status: entry.status, addedAt: now }
          : { ...merged.list[entry.seriesId], status: entry.status };

      const nextWatched =
        entry.progress > 0
          ? {
              ...merged.watched,
              [entry.seriesId]: mergeEpisodes(merged.watched[entry.seriesId], firstEpisodes(entry.progress)),
            }
          : merged.watched;

      return { list: { ...merged.list, [entry.seriesId]: listEntry }, watched: nextWatched, summary };
    },
    { list, watched, summary: { added: 0, updated: 0, unchanged: 0 } },
  );

export const withNoteAdded = (notes, episodeId, text) => ({
  ...notes,
  [episodeId]: [{ id: crypto.randomUUID(), text, createdAt: Date.now() }, ...(notes[episodeId] || [])],
});

export const withNoteDeleted = (notes, episodeId, noteId) => {
  const remainingNotes = (notes[episodeId] ?? []).filter((note) => note.id !== noteId);

  return remainingNotes.length ? { ...notes, [episodeId]: remainingNotes } : withoutKey(notes, episodeId);
};
