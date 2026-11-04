import { describe, expect, it } from 'vitest';
import {
  mergeImportedEntries,
  withEpisodeUnwatched,
  withEpisodeWatched,
  withNoteAdded,
  withNoteDeleted,
  withWatchDateRecorded,
  withWatchDateRemoved,
} from '@/utils/library';
import { isSameScan } from '@/utils/libraryScan';

describe('watched episodes', () => {
  it('adds an episode in order once, and removes the show when its last episode is unmarked', () => {
    const watched = withEpisodeWatched({ 7: [1, 3] }, 7, 2);

    expect(watched).toEqual({ 7: [1, 2, 3] });
    expect(withEpisodeWatched(watched, 7, 2)).toBe(watched);
    expect(withEpisodeUnwatched({ 7: [4] }, 7, 4)).toEqual({});
  });
});

describe('mergeImportedEntries', () => {
  it('adds new shows, updates ones with more progress and leaves the rest alone', () => {
    const list = { 1: { status: 'watching', addedAt: 5 }, 2: { status: 'completed', addedAt: 6 } };
    const watched = { 1: [1, 2], 2: [1, 2, 3, 4] };

    const merged = mergeImportedEntries(
      list,
      watched,
      [
        { seriesId: 1, status: 'completed', progress: 4 },
        { seriesId: 2, status: 'watching', progress: 1 },
        { seriesId: 3, status: 'planning', progress: 0 },
      ],
      100,
    );

    expect(merged.summary).toEqual({ added: 1, updated: 1, unchanged: 1 });
    expect(merged.list[1]).toEqual({ status: 'completed', addedAt: 5 });
    expect(merged.list[2].status).toBe('completed');
    expect(merged.list[3]).toEqual({ status: 'planning', addedAt: 100 });
    expect(merged.watched[1]).toEqual([1, 2, 3, 4]);
  });
});

describe('notes', () => {
  it('adds notes newest first and drops the episode when its last note is deleted', () => {
    const notes = withNoteAdded(withNoteAdded({}, '1-1', 'first'), '1-1', 'second');

    expect(notes['1-1'].map((note) => note.text)).toEqual(['second', 'first']);

    const withoutBoth = notes['1-1'].reduce((current, note) => withNoteDeleted(current, '1-1', note.id), notes);

    expect(withoutBoth).toEqual({});
  });
});

describe('isSameScan', () => {
  const scan = { root: 'D:/Anime', files: [{ path: 'Show/01.mkv', inProgress: false }] };

  it('treats an identical rescan as unchanged and a finished download as a change', () => {
    expect(isSameScan(scan, { root: 'D:/Anime', files: [{ path: 'Show/01.mkv', inProgress: false }] })).toBe(true);
    expect(isSameScan(scan, { root: 'D:/Anime', files: [{ path: 'Show/01.mkv', inProgress: true }] })).toBe(false);
    expect(isSameScan(scan, { root: 'E:/Anime', files: scan.files })).toBe(false);
  });
});

describe('watch dates', () => {
  it('keeps the first date an episode was watched', () => {
    const watchDates = withWatchDateRecorded({}, '1-1', 100);

    expect(watchDates).toEqual({ '1-1': 100 });
    expect(withWatchDateRecorded(watchDates, '1-1', 200)).toBe(watchDates);
  });

  it('drops the date when an episode is unmarked, and leaves state alone when there was none', () => {
    expect(withWatchDateRemoved({ '1-1': 100, '1-2': 200 }, '1-1')).toEqual({ '1-2': 200 });

    const watchDates = { '1-2': 200 };

    expect(withWatchDateRemoved(watchDates, '1-1')).toBe(watchDates);
  });
});

describe('isSameScan with an unreachable folder', () => {
  const root = 'D:\\Anime';

  it('notices when the folder stops being reachable, even with the same empty list', () => {
    expect(isSameScan({ root, files: [] }, { root, files: [], isUnreachable: true })).toBe(false);
  });

  it('treats a missing flag and false as the same', () => {
    expect(isSameScan({ root, files: [] }, { root, files: [], isUnreachable: false })).toBe(true);
  });
});
