import { act, cleanup, render, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LibraryProvider } from '@/context/LibraryContext';
import { useLibrary, usePlaybackProgress } from '@/hooks/useLibrary';
import { episodeId } from '@/utils/episodes';

const FIRST_WATCH_TIME = new Date(2026, 10, 1, 20).getTime();
const LATER_WATCH_TIME = new Date(2026, 10, 2, 20).getTime();

const renderLibrary = () => renderHook(() => useLibrary(), { wrapper: LibraryProvider }).result;

describe('LibraryContext playback progress', () => {
  afterEach(cleanup);

  it('saves a position without telling components that only read the library', () => {
    const seen = { libraryRenders: 0, library: null, progress: null };

    const LibraryReader = () => {
      seen.libraryRenders += 1;
      seen.library = useLibrary();

      return null;
    };

    const ProgressReader = () => {
      seen.progress = usePlaybackProgress();

      return null;
    };

    render(
      <LibraryProvider>
        <LibraryReader />
        <ProgressReader />
      </LibraryProvider>,
    );

    const rendersBeforeSaving = seen.libraryRenders;

    act(() => seen.library.saveProgress('7-3', 120));

    expect(seen.progress['7-3']).toBe(120);
    expect(seen.libraryRenders).toBe(rendersBeforeSaving);
  });
});

const markWatchedAt = (library, watchedAt, seriesId, episodeNumber) => {
  vi.setSystemTime(watchedAt);
  act(() => library.current.markWatched(seriesId, episodeNumber));
};

describe('LibraryContext watched episodes', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('records the watch date together with the watched episode', () => {
    const library = renderLibrary();

    markWatchedAt(library, FIRST_WATCH_TIME, 101, 3);
    expect(library.current.watched[101]).toEqual([3]);
    expect(library.current.watchDates[episodeId(101, 3)]).toBe(FIRST_WATCH_TIME);
  });

  it('keeps the first watch date when an episode is marked watched again', () => {
    const library = renderLibrary();

    markWatchedAt(library, FIRST_WATCH_TIME, 102, 1);
    markWatchedAt(library, LATER_WATCH_TIME, 102, 1);
    expect(library.current.watched[102]).toEqual([1]);
    expect(library.current.watchDates[episodeId(102, 1)]).toBe(FIRST_WATCH_TIME);
  });

  it('removes the watch date together with the watched episode, leaving the others', () => {
    const library = renderLibrary();

    markWatchedAt(library, FIRST_WATCH_TIME, 103, 1);
    markWatchedAt(library, LATER_WATCH_TIME, 103, 2);
    act(() => library.current.unmarkWatched(103, 1));
    expect(library.current.watched[103]).toEqual([2]);
    expect(library.current.watchDates[episodeId(103, 1)]).toBeUndefined();
    expect(library.current.watchDates[episodeId(103, 2)]).toBe(LATER_WATCH_TIME);
  });

  it('forgets the show and its last date when its only episode is unmarked', () => {
    const library = renderLibrary();

    markWatchedAt(library, FIRST_WATCH_TIME, 104, 5);
    act(() => library.current.unmarkWatched(104, 5));
    expect(library.current.watched[104]).toBeUndefined();
    expect(library.current.watchDates[episodeId(104, 5)]).toBeUndefined();
  });

  it('dates re-watched episodes afresh after they were unmarked', () => {
    const library = renderLibrary();

    markWatchedAt(library, FIRST_WATCH_TIME, 105, 1);
    act(() => library.current.unmarkWatched(105, 1));
    markWatchedAt(library, LATER_WATCH_TIME, 105, 1);
    expect(library.current.watchDates[episodeId(105, 1)]).toBe(LATER_WATCH_TIME);
  });
});
