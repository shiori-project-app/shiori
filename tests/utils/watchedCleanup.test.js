import { describe, expect, it } from 'vitest';
import { matchSeriesFiles } from '@/utils/episodeFiles';
import {
  cleanupCutoff,
  episodesBySeries,
  findCleanupCandidates,
  initiallySelectedPaths,
  seriesIdsWithDueEpisodes,
  totalBytes,
} from '@/utils/watchedCleanup';

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 10, 4);
const CUTOFF = cleanupCutoff(30, NOW);
const OLD_ENOUGH = NOW - 31 * DAY_MS;
const TOO_RECENT = NOW - 29 * DAY_MS;
const ROOT = 'D:\\Anime';
const NO_LINKS = { folders: [], episodes: {} };

const FRIEREN = { id: 1, title: 'Frieren', romajiTitle: 'Sousou no Frieren', released: 28, format: 'TV' };
const NARUTO = { id: 2, title: 'Naruto', romajiTitle: 'Naruto', released: 220, format: 'TV' };

const fileInShowFolder = (folder, name, extra = {}) => ({ path: `${folder}\\${name}`, name, folder, ...extra });

const looseFile = (name) => ({ path: name, name, folder: '' });

const candidatesFor = ({ seriesMatches, watched, watchDates }) =>
  findCleanupCandidates({ seriesMatches, library: { watched, watchDates }, cutoff: CUTOFF, root: ROOT });

const singleMatch = (series, filesByEpisode, links = NO_LINKS) => [
  { series, filesByEpisode: new Map(filesByEpisode), links },
];

describe('cleanupCutoff', () => {
  it('goes back the chosen number of days', () => {
    expect(NOW - cleanupCutoff(7, NOW)).toBe(7 * DAY_MS);
  });
});

describe('seriesIdsWithDueEpisodes', () => {
  it('finds shows with an episode watched long enough ago', () => {
    const library = { watched: { 1: [1], 2: [1] }, watchDates: { '1-1': OLD_ENOUGH, '2-1': TOO_RECENT } };

    expect(seriesIdsWithDueEpisodes(library, CUTOFF)).toEqual([1]);
  });

  it('counts an episode watched exactly at the cutoff', () => {
    const library = { watched: { 1: [1] }, watchDates: { '1-1': CUTOFF } };

    expect(seriesIdsWithDueEpisodes(library, CUTOFF)).toEqual([1]);
  });

  it('skips episodes with no watch date, such as imported ones', () => {
    expect(seriesIdsWithDueEpisodes({ watched: { 1: [1] }, watchDates: {} }, CUTOFF)).toEqual([]);
  });

  it('skips a date left behind for an episode no longer marked watched', () => {
    expect(seriesIdsWithDueEpisodes({ watched: { 1: [2] }, watchDates: { '1-1': OLD_ENOUGH } }, CUTOFF)).toEqual([]);
  });
});

describe('findCleanupCandidates', () => {
  const episodeFile = fileInShowFolder('Frieren', 'Frieren - 01.mkv');

  it('lists a finished file for an old enough watched episode', () => {
    const [candidate, ...others] = candidatesFor({
      seriesMatches: singleMatch(FRIEREN, [[1, episodeFile]]),
      watched: { 1: [1] },
      watchDates: { '1-1': OLD_ENOUGH },
    });

    expect(others).toEqual([]);

    expect(candidate).toMatchObject({
      path: episodeFile.path,
      name: episodeFile.name,
      series: FRIEREN,
      episodeNumber: 1,
      watchedAt: OLD_ENOUGH,
      isConfident: true,
    });
  });

  it.each([
    ['watched too recently', { watched: { 1: [1] }, watchDates: { '1-1': TOO_RECENT } }],
    ['never watched', { watched: {}, watchDates: {} }],
    ['watched but with no date', { watched: { 1: [1] }, watchDates: {} }],
    ['unmarked, with a date left behind', { watched: {}, watchDates: { '1-1': OLD_ENOUGH } }],
  ])('leaves out an episode %s', (_name, library) => {
    expect(candidatesFor({ seriesMatches: singleMatch(FRIEREN, [[1, episodeFile]]), ...library })).toEqual([]);
  });

  it('leaves out a file still downloading', () => {
    const unfinishedFile = { ...episodeFile, inProgress: true };

    expect(
      candidatesFor({
        seriesMatches: singleMatch(FRIEREN, [[1, unfinishedFile]]),
        watched: { 1: [1] },
        watchDates: { '1-1': OLD_ENOUGH },
      }),
    ).toEqual([]);
  });

  it('keeps a file that an unwatched episode also needs', () => {
    expect(
      candidatesFor({
        seriesMatches: singleMatch(FRIEREN, [
          [1, episodeFile],
          [2, episodeFile],
        ]),

        watched: { 1: [1] },
        watchDates: { '1-1': OLD_ENOUGH },
      }),
    ).toEqual([]);
  });

  it('keeps a file another show still needs', () => {
    expect(
      candidatesFor({
        seriesMatches: [...singleMatch(FRIEREN, [[1, episodeFile]]), ...singleMatch(NARUTO, [[1, episodeFile]])],
        watched: { 1: [1] },
        watchDates: { '1-1': OLD_ENOUGH },
      }),
    ).toEqual([]);
  });

  it('lists one file once when every episode pointing at it is due, tracking all of them', () => {
    const candidates = candidatesFor({
      seriesMatches: singleMatch(FRIEREN, [
        [1, episodeFile],
        [2, episodeFile],
      ]),

      watched: { 1: [1, 2] },
      watchDates: { '1-1': OLD_ENOUGH, '1-2': OLD_ENOUGH },
    });

    expect(candidates).toHaveLength(1);

    expect(candidates[0].episodes).toEqual([
      { seriesId: 1, episodeNumber: 1 },
      { seriesId: 1, episodeNumber: 2 },
    ]);
  });

  it('sorts by show, then episode', () => {
    const candidates = candidatesFor({
      seriesMatches: [
        ...singleMatch(NARUTO, [[1, fileInShowFolder('Naruto', 'Naruto - 01.mkv')]]),

        ...singleMatch(FRIEREN, [
          [2, fileInShowFolder('Frieren', 'Frieren - 02.mkv')],
          [1, fileInShowFolder('Frieren', 'Frieren - 01.mkv')],
        ]),
      ],

      watched: { 1: [1, 2], 2: [1] },
      watchDates: { '1-1': OLD_ENOUGH, '1-2': OLD_ENOUGH, '2-1': OLD_ENOUGH },
    });

    expect(candidates.map((candidate) => candidate.name)).toEqual([
      'Frieren - 01.mkv',
      'Frieren - 02.mkv',
      'Naruto - 01.mkv',
    ]);
  });
});

describe('how sure a match is', () => {
  const library = { watched: { 2: [5] }, watchDates: { '2-5': OLD_ENOUGH } };

  const isConfidentFor = (file, links = NO_LINKS, series = NARUTO) =>
    candidatesFor({ seriesMatches: singleMatch(series, [[5, file]], links), ...library })[0].isConfident;

  it('trusts a file in the show’s own folder', () => {
    expect(isConfidentFor(fileInShowFolder('Naruto', 'anything - 05.mkv'))).toBe(true);
  });

  it('trusts a loose file named exactly after the show', () => {
    expect(isConfidentFor(looseFile('[SubsPlease] Naruto - 05 (1080p) [ABC123].mkv'))).toBe(true);
  });

  it('doubts a loose file for a different show whose name contains this one', () => {
    const shippudenFile = looseFile('Naruto Shippuden - 05.mkv');

    expect(matchSeriesFiles(NARUTO, [shippudenFile]).get(5)).toBe(shippudenFile);
    expect(isConfidentFor(shippudenFile)).toBe(false);
  });

  it('trusts a file linked by hand, even with an unrelated name', () => {
    const file = looseFile('clip.mkv');

    expect(isConfidentFor(file, { folders: [], episodes: { 5: `${ROOT}\\clip.mkv` } })).toBe(true);
  });

  it('trusts a file in a folder linked by hand', () => {
    const file = fileInShowFolder('Old Stuff', 'clip - 05.mkv');

    expect(isConfidentFor(file, { folders: [`${ROOT}\\Old Stuff`], episodes: {} })).toBe(true);
  });

  it('starts only the confident matches ticked', () => {
    const candidates = [
      { path: 'sure.mkv', isConfident: true },
      { path: 'unsure.mkv', isConfident: false },
    ];

    expect([...initiallySelectedPaths(candidates)]).toEqual(['sure.mkv']);
  });
});

describe('episodesBySeries', () => {
  it('groups the chosen episodes per show', () => {
    const candidates = [
      { episodes: [{ seriesId: 1, episodeNumber: 1 }] },
      { episodes: [{ seriesId: 2, episodeNumber: 5 }] },
      { episodes: [{ seriesId: 1, episodeNumber: 2 }] },
    ];

    expect([...episodesBySeries(candidates)]).toEqual([
      [1, [1, 2]],
      [2, [5]],
    ]);
  });
});

describe('totalBytes', () => {
  it('adds up the sizes', () => {
    expect(totalBytes([{ bytes: 100 }, { bytes: 50 }])).toBe(150);
  });
});
