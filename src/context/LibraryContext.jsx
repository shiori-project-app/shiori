import { createContext, useEffect, useMemo, useRef } from 'react';
import { HISTORY_LIMIT } from '@/config/app.config';
import { usePersistentState, useUserDataState } from '@/hooks/usePersistentState';
import { episodeId } from '@/utils/episodes';
import {
  withEpisodeFileLinked,
  withEpisodeFileUnlinked,
  withFolderLinked,
  withFolderUnlinked,
} from '@/utils/fileLinks';
import {
  mergeImportedEntries,
  withEpisodeUnwatched,
  withEpisodeWatched,
  withNoteAdded,
  withNoteDeleted,
  withoutKey,
  withWatchDateRecorded,
  withWatchDateRemoved,
} from '@/utils/library';

export const LibraryContext = createContext(null);

export const PlaybackProgressContext = createContext({});

export const LibraryProvider = ({ children }) => {
  const [list, setList] = useUserDataState('list', {});
  const [watched, setWatched] = useUserDataState('watched', {});
  const [watchDates, setWatchDates] = useUserDataState('watchDates', {});
  const [history, setHistory] = useUserDataState('history', []);
  const [progress, setProgress] = useUserDataState('progress', {});
  const [autoplay, setAutoplay] = usePersistentState('autoplay', true);
  const [notes, setNotes] = useUserDataState('notes', {});
  const [fileLinks, setFileLinks] = useUserDataState('fileLinks', {});
  const latestLibrary = useRef({ list, watched });

  useEffect(() => {
    latestLibrary.current = { list, watched };
  }, [list, watched]);

  const actions = useMemo(
    () => ({
      setListStatus: (seriesId, status) =>
        setList((allEntries) => ({
          ...allEntries,
          [seriesId]: { addedAt: Date.now(), ...allEntries[seriesId], status },
        })),

      removeFromList: (seriesId) => setList((allEntries) => withoutKey(allEntries, seriesId)),

      markWatched: (seriesId, episodeNumber) => {
        setWatched((allWatched) => withEpisodeWatched(allWatched, seriesId, episodeNumber));
        setWatchDates((allDates) => withWatchDateRecorded(allDates, episodeId(seriesId, episodeNumber), Date.now()));
      },

      unmarkWatched: (seriesId, episodeNumber) => {
        setWatched((allWatched) => withEpisodeUnwatched(allWatched, seriesId, episodeNumber));
        setWatchDates((allDates) => withWatchDateRemoved(allDates, episodeId(seriesId, episodeNumber)));
      },

      importList: (entries) => {
        const merged = mergeImportedEntries(latestLibrary.current.list, latestLibrary.current.watched, entries);

        latestLibrary.current = { list: merged.list, watched: merged.watched };
        setList(merged.list);
        setWatched(merged.watched);

        return merged.summary;
      },

      addToHistory: (episodeId) =>
        setHistory((allEpisodeIds) =>
          [episodeId, ...allEpisodeIds.filter((historyEpisodeId) => historyEpisodeId !== episodeId)].slice(
            0,
            HISTORY_LIMIT,
          ),
        ),

      clearHistory: () => {
        setHistory([]);
        setProgress({});
      },

      saveProgress: (episodeId, seconds) =>
        setProgress((allProgress) => {
          const otherProgress = withoutKey(allProgress, episodeId);

          return seconds == null ? otherProgress : { ...otherProgress, [episodeId]: seconds };
        }),

      toggleAutoplay: () => setAutoplay((isEnabled) => !isEnabled),
      addNote: (episodeId, text) => setNotes((allNotes) => withNoteAdded(allNotes, episodeId, text)),
      deleteNote: (episodeId, noteId) => setNotes((allNotes) => withNoteDeleted(allNotes, episodeId, noteId)),

      linkEpisodeFile: (seriesId, episodeNumber, filePath) =>
        setFileLinks((allLinks) => withEpisodeFileLinked(allLinks, seriesId, episodeNumber, filePath)),

      unlinkEpisodeFile: (seriesId, episodeNumber) =>
        setFileLinks((allLinks) => withEpisodeFileUnlinked(allLinks, seriesId, episodeNumber)),

      linkFolder: (seriesId, folder) => setFileLinks((allLinks) => withFolderLinked(allLinks, seriesId, folder)),
      unlinkFolder: (seriesId, folder) => setFileLinks((allLinks) => withFolderUnlinked(allLinks, seriesId, folder)),
    }),
    [setList, setWatched, setWatchDates, setHistory, setProgress, setAutoplay, setNotes, setFileLinks],
  );

  const value = useMemo(
    () => ({ list, watched, watchDates, history, autoplay, notes, fileLinks, ...actions }),
    [list, watched, watchDates, history, autoplay, notes, fileLinks, actions],
  );

  return (
    <LibraryContext value={value}>
      <PlaybackProgressContext value={progress}>{children}</PlaybackProgressContext>
    </LibraryContext>
  );
};
