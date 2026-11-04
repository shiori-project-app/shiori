import { describe, expect, it } from 'vitest';
import {
  isSavedSeriesFresh,
  episodesNeedingSkipTimes,
  idsNeedingRefresh,
  needsEpisodeTitles,
  prepareFileMatchesInSteps,
  SAVED_SERIES_REFRESH_MS,
  savedIdsToRemove,
  seriesIdsToKeep,
} from '@/utils/offlineLibrary';

const NOW = 1_800_000_000_000;

const series = (id, title, extra = {}) => ({ id, title, romajiTitle: title, malId: id * 10, released: 12, ...extra });

const entry = (seriesData, extra = {}) => ({ series: seriesData, episodeOffset: 0, savedAt: NOW, ...extra });

const file = (folder, name, extra = {}) => ({ path: `${folder}\\${name}`, folder, name, inProgress: false, ...extra });

const noInputs = {
  list: {},
  history: [],
  tracked: {},
  downloads: [],
  seriesWithLocalFiles: [],
  savedEntries: {},
  files: [],
};

describe('isSavedSeriesFresh', () => {
  const HOUR_MS = 60 * 60 * 1000;
  const NOW = Date.UTC(2026, 10, 4);

  const entry = (status, ageHours, seriesExtra = {}, entryExtra = {}) => ({
    series: { id: 1, status, ...seriesExtra },
    savedAt: NOW - ageHours * HOUR_MS,
    ...entryExtra,
  });

  it.each([
    ['a finished show under a week old', entry('Finished', 24 * 6), true],
    ['a finished show over a week old', entry('Finished', 24 * 8), false],
    ['an airing show under 6 hours old', entry('Airing', 5), true],
    ['an airing show over 6 hours old', entry('Airing', 7), false],
    ['an upcoming show over 6 hours old', entry('Upcoming', 7), false],
    ['a show on hiatus over 6 hours old', entry('Hiatus', 7), false],
  ])('%s', (_name, savedEntry, isFresh) => {
    expect(isSavedSeriesFresh(savedEntry, NOW)).toBe(isFresh);
  });

  it('treats a show as old once its next episode has aired, however recently it was saved', () => {
    const justAired = entry('Airing', 1, { nextAiringAt: (NOW - HOUR_MS / 2) / 1000 });
    const notYetAired = entry('Airing', 1, { nextAiringAt: (NOW + HOUR_MS) / 1000 });

    expect(isSavedSeriesFresh(justAired, NOW)).toBe(false);
    expect(isSavedSeriesFresh(notYetAired, NOW)).toBe(true);
  });

  it('counts from the last fetch when there is one', () => {
    expect(isSavedSeriesFresh(entry('Airing', 24, {}, { seriesFetchedAt: NOW - HOUR_MS }), NOW)).toBe(true);
    expect(isSavedSeriesFresh(entry('Airing', 1, {}, { seriesFetchedAt: NOW - 7 * HOUR_MS }), NOW)).toBe(false);
  });

  it('does not trust a date in the future, after the clock changed', () => {
    expect(isSavedSeriesFresh(entry('Finished', -5), NOW)).toBe(false);
  });
});

describe('offline library', () => {
  it('keeps shows from My List, History, tracking, the download queue and the download folder', () => {
    const frieren = entry(series(5, 'Frieren'));

    const keptIds = seriesIdsToKeep({
      ...noInputs,
      list: { 1: { status: 'watching' } },
      history: ['2-4', '2-3'],
      tracked: { 3: {} },
      downloads: [{ seriesId: 4 }, { seriesId: undefined }],
      seriesWithLocalFiles: [6],
      savedEntries: { 5: frieren, 7: entry(series(7, 'Old Show')) },
      files: [file('Frieren', 'Frieren - 03.mp4')],
    });

    expect([...keptIds].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('removes saved shows nobody needs any more', () => {
    const savedEntries = { 1: entry(series(1, 'A')), 9: entry(series(9, 'B')) };

    expect(savedIdsToRemove(new Set([1]), savedEntries)).toEqual([9]);
  });

  it('refreshes shows that are missing or older than a day', () => {
    const savedEntries = {
      1: entry(series(1, 'Fresh')),
      2: entry(series(2, 'Stale'), { savedAt: NOW - SAVED_SERIES_REFRESH_MS }),
    };

    expect(idsNeedingRefresh(new Set([1, 2, 3]), savedEntries, NOW)).toEqual([2, 3]);
  });

  it('fetches episode names again only when new episodes came out', () => {
    expect(needsEpisodeTitles(series(1, 'A'), null)).toBe(true);
    expect(needsEpisodeTitles(series(1, 'A'), { episodeTitlesUpTo: 12 })).toBe(false);
    expect(needsEpisodeTitles(series(1, 'A', { released: 13 }), { episodeTitlesUpTo: 12 })).toBe(true);
    expect(needsEpisodeTitles(series(1, 'A', { malId: null }), null)).toBe(false);
  });

  it('asks for skip times only for finished downloads that have none saved', () => {
    const savedEntries = { 5: entry(series(5, 'Frieren')) };

    const files = [
      file('Frieren', 'Frieren - 01.mp4'),
      file('Frieren', 'Frieren - 02.mp4'),
      file('Frieren', 'Frieren - 03.mkv', { inProgress: true }),
    ];

    expect(episodesNeedingSkipTimes(savedEntries, files, { '50:1': [] })).toEqual([{ malId: 50, episodeNumber: 2 }]);
  });
});

describe('offline sync and linked files', () => {
  const linked = file('stuff', 'mine.mkv');

  const linkInputs = {
    root: 'D:\\Anime',
    fileLinks: { 1: { folders: [], episodes: { 4: 'D:\\Anime\\stuff\\mine.mkv' } } },
  };

  const savedEntries = { 1: entry(series(1, 'Linked Show')) };

  it('asks for skip times of an episode linked by hand', () => {
    expect(episodesNeedingSkipTimes(savedEntries, [linked], {})).toEqual([]);
    expect(episodesNeedingSkipTimes(savedEntries, [linked], {}, linkInputs)).toEqual([{ malId: 10, episodeNumber: 4 }]);
  });

  it('notices a new link on the same scan', () => {
    const files = [linked];

    expect(episodesNeedingSkipTimes(savedEntries, files, {}, { ...linkInputs, fileLinks: {} })).toEqual([]);
    expect(episodesNeedingSkipTimes(savedEntries, files, {}, linkInputs)).toEqual([{ malId: 10, episodeNumber: 4 }]);
  });

  it('keeps a saved show that has links', () => {
    const keptIds = seriesIdsToKeep({ ...noInputs, savedEntries, files: [], fileLinks: linkInputs.fileLinks });

    expect(savedIdsToRemove(keptIds, savedEntries)).toEqual([]);
  });
});

describe('offline sync speed with a big library', () => {
  const SHOW_COUNT = 500;
  const FILE_COUNT = 3000;

  const LONGEST_STEP_BUDGET_MS = 200;
  const REPEAT_SYNC_BUDGET_MS = 100;

  const savedEntries = Object.fromEntries(
    Array.from({ length: SHOW_COUNT }, (_, index) => [
      index + 1,

      {
        series: {
          id: index + 1,
          malId: index + 1,
          title: `Library Show Number ${index + 1}`,
          romajiTitle: `Toshokan Shou ${index + 1}`,
          released: 12,
        },

        episodeOffset: 0,
        savedAt: 1,
      },
    ]),
  );

  const files = Array.from({ length: FILE_COUNT }, (_, index) => {
    const showNumber = (index % SHOW_COUNT) + 1;

    return {
      path: `Library Show Number ${showNumber}/[Group] Library Show Number ${showNumber} - ${(index % 12) + 1} (1080p).mkv`,
      name: `[Group] Library Show Number ${showNumber} - ${(index % 12) + 1} (1080p).mkv`,
      folder: `Library Show Number ${showNumber}`,
      inProgress: false,
    };
  });

  const syncInputs = {
    list: {},
    history: [],
    tracked: {},
    downloads: [],
    seriesWithLocalFiles: [],
    savedEntries,
    files,
  };

  const longestGapBetweenTimers = () => {
    let longestGapMs = 0;
    let lastBeatAt = performance.now();

    const heartbeat = setInterval(() => {
      longestGapMs = Math.max(longestGapMs, performance.now() - lastBeatAt);
      lastBeatAt = performance.now();
    }, 1);

    return {
      stop: () => {
        clearInterval(heartbeat);

        return longestGapMs;
      },
    };
  };

  it('never blocks the page for long while matching files, and repeat syncs are nearly free', async () => {
    const watch = longestGapBetweenTimers();

    await prepareFileMatchesInSteps(savedEntries, files);
    expect(watch.stop()).toBeLessThan(LONGEST_STEP_BUDGET_MS);

    const startedAt = performance.now();
    const keptIds = seriesIdsToKeep(syncInputs);

    const missingSkipTimes = episodesNeedingSkipTimes(savedEntries, files, {});

    expect(performance.now() - startedAt).toBeLessThan(REPEAT_SYNC_BUDGET_MS);
    expect(keptIds.size).toBe(SHOW_COUNT);
    expect(missingSkipTimes.length).toBeGreaterThan(0);
  });

  it('matches again after a new scan', async () => {
    const entries = { 1: savedEntries[1] };

    expect(episodesNeedingSkipTimes(entries, files, {}).length).toBeGreaterThan(0);
    expect(episodesNeedingSkipTimes(entries, [], {})).toEqual([]);
  });
});
