import { describe, expect, it } from 'vitest';
import {
  hasFilesNamingSeries,
  isInSeriesFolder,
  matchSeriesFiles,
  namesSeriesExactly,
  parseEpisodeNumber,
} from '@/utils/episodeFiles';
import { safeName } from '@shared/fileNames';

const SERIES_FOR_STRICT_CHECKS = { title: 'Frieren: Beyond Journey’s End', romajiTitle: 'Sousou no Frieren' };

describe('namesSeriesExactly', () => {
  const namesIt = (name, series = SERIES_FOR_STRICT_CHECKS) => namesSeriesExactly(series, { name });

  it.each([
    '[SubsPlease] Sousou no Frieren - 05 (1080p) [ABC123].mkv',
    'Sousou no Frieren - 05.mkv',
    'Sousou.no.Frieren.S01E05.1080p.mkv',
    'Sousou no Frieren Season 2 - 05.mkv',
    'Frieren - Beyond Journey’s End - 05.mkv',
    "Frieren Beyond Journey's End Episode 5.mkv",
    'Sousou no Frieren 05.mkv',
  ])('accepts %s', (name) => {
    expect(namesIt(name)).toBe(true);
  });

  it.each([
    ['Naruto Shippuden - 05.mkv', { title: 'Naruto', romajiTitle: 'Naruto' }],
    ['Boruto - Naruto Next Generations - 05.mkv', { title: 'Naruto', romajiTitle: 'Naruto' }],
    ['Sousou no Frieren Specials - 05.mkv', SERIES_FOR_STRICT_CHECKS],
    ['Something Else - 05.mkv', SERIES_FOR_STRICT_CHECKS],
  ])('rejects %s', (name, series) => {
    expect(namesIt(name, series)).toBe(false);
  });
});

describe('isInSeriesFolder', () => {
  const FOLDER_SERIES = { title: 'Frieren: Beyond Journey’s End' };

  it('matches the folder Shiori saves this show to', () => {
    expect(isInSeriesFolder(FOLDER_SERIES, { name: 'a.mkv', folder: safeName(FOLDER_SERIES.title) })).toBe(true);
  });

  it('rejects a loose file and another show’s folder', () => {
    expect(isInSeriesFolder(FOLDER_SERIES, { name: 'a.mkv', folder: '' })).toBe(false);
    expect(isInSeriesFolder(FOLDER_SERIES, { name: 'a.mkv', folder: 'Other Show' })).toBe(false);
  });
});

describe('parseEpisodeNumber', () => {
  it.each([
    ['[SubsPlease] Sousou no Frieren S2 - 08 (1080p) [C8B6130B].mkv', 8],
    ['[Erai-raws] Kusuriya no Hitorigoto 3rd Season - 05 [1080p CR WEBRip HEVC AAC][MultiSub][4A90834B].mkv', 5],
    ['[SubsPlease] One Piece - 1120 (1080p) [ABCD1234].mkv', 1120],
    ['Frieren Beyond Journey’s End Season 2 - 08.mp4', 8],
    ['Show.Name.S02E08.1080p.WEB.x265.mkv', 8],
    ['Show Name Episode 12.mp4', 12],
    ['[Group] Show - 03v2 [720p].mkv', 3],
    ['Show 07.mkv', 7],
    ['[Erai-raws] Ore dake Level Up na Ken Season 2 - 11 [1080p].mkv', 11],
    ['[Group] Mushoku Tensei III - 05 [1080p].mkv', 5],

    [
      'That Time I Got Reincarnated as a Slime S04E24 The Hero Awakens 1080p CR WEB-DL (Tensei Shitara Slime Datta Ken 4th Season Part 1 & 2)',
      24,
    ],
  ])('%s → %i', (name, expected) => {
    expect(parseEpisodeNumber(name)).toBe(expected);
  });

  it.each([
    '[SubsPlease] Sousou no Frieren S2 (01-10) (1080p) [Batch]',
    '[9volt] Sousou no Frieren - Season 2 (WEB 1080p HEVC EAC-3 Dual Audio) [Batch]',
    '[Group] Solo Leveling Season 2 (Batch) [1080p]',
    '[Group] Solo Leveling Season 2 [1080p]',
    '[SubsPlease] Mushoku Tensei S2 - 01-24 (1080p)',
    '[Group] Show - 01 ~ 12 [1080p]',
    '[AnoZu] That Time I Got Reincarnated as a Slime S04E01-E24 1080p CR WEB-DL Dual-Audio',
    'Movie Title (2023) [1080p].mkv',
  ])('no episode in %s', (name) => {
    expect(parseEpisodeNumber(name)).toBeNull();
  });
});

describe('matchSeriesFiles', () => {
  const frierenS2 = {
    title: 'Frieren: Beyond Journey’s End Season 2',
    romajiTitle: 'Sousou no Frieren 2nd Season',
    released: 10,
  };

  const file = (name, folder = '') => ({ name, folder, path: folder ? `${folder}\\${name}` : name });

  it('finds files in the show folder under any release name', () => {
    const found = matchSeriesFiles(frierenS2, [
      file('Frieren Beyond Journey’s End Season 2 - 01.mp4', 'Frieren Beyond Journey’s End Season 2'),
      file('[SubsPlease] Sousou no Frieren S2 - 02 (1080p) [AAAA].mkv', 'Frieren Beyond Journey’s End Season 2'),
    ]);

    expect([...found.keys()].sort()).toEqual([1, 2]);
  });

  it('finds files elsewhere by title, only for the same season', () => {
    const found = matchSeriesFiles(frierenS2, [
      file('[SubsPlease] Sousou no Frieren S2 - 05 (1080p) [AAAA].mkv', 'Anime'),
      file('[SubsPlease] Sousou no Frieren - 06 (1080p) [AAAA].mkv', 'Anime'),
      file('[SubsPlease] Other Show - 07 (1080p) [AAAA].mkv', 'Anime'),
    ]);

    expect([...found.keys()]).toEqual([5]);
  });

  it('renumbers releases that keep counting across seasons', () => {
    const blackCloverS2 = { title: 'Black Clover Season 2', romajiTitle: 'Black Clover 2nd Season', released: 4 };

    const found = matchSeriesFiles(
      blackCloverS2,
      [
        file('[SubsPlease] Black Clover - 174 (1080p) [AAAA].mkv', 'Black Clover Season 2'),
        file('[SubsPlease] Black Clover - 172 (1080p) [BBBB].mkv', 'Anime'),
        file('[SubsPlease] Black Clover - 150 (1080p) [CCCC].mkv', 'Anime'),
      ],
      170,
    );

    expect([...found.keys()].sort()).toEqual([2, 4]);
  });

  it('keeps season numbering for files whose name names the season (Solo Leveling S2: 13 episodes, 12 before)', () => {
    const soloS2 = {
      title: 'Solo Leveling Season 2 -Arise from the Shadow-',
      romajiTitle: 'Ore dake Level Up na Ken: Season 2 - Arise from the Shadow',
      released: 13,
    };

    const folder = 'Solo Leveling Season 2 -Arise from the Shadow-';

    const found = matchSeriesFiles(
      soloS2,
      [
        file('Solo Leveling Season 2 -Arise from the Shadow- - 11.mp4', folder),
        file('Solo Leveling Season 2 -Arise from the Shadow- - 13.mp4', folder),
        file('[Erai-raws] Ore dake Level Up na Ken Season 2 - 12 [1080p].mkv', folder),
        file('[SubsPlease] Solo Leveling - 13 (1080p) [AAAA].mkv', folder),
      ],
      12,
    );

    expect(Object.fromEntries([...found].map(([n, f]) => [n, f.name.slice(0, 22)]))).toEqual({
      1: '[SubsPlease] Solo Leve',
      11: 'Solo Leveling Season 2',
      12: '[Erai-raws] Ore dake L',
      13: 'Solo Leveling Season 2',
    });
  });

  it('treats a movie file in its folder as episode 1', () => {
    const movie = { title: 'Your Name.', romajiTitle: 'Kimi no Na wa.', released: 1 };

    expect([...matchSeriesFiles(movie, [file('Your.Name.2016.1080p.mkv', 'Your Name.')]).keys()]).toEqual([1]);
  });
});

describe('matchSeriesFiles with unfinished files', () => {
  const series = { id: 1, title: 'Frieren', romajiTitle: 'Frieren', released: 12 };

  const file = (name, inProgress) => ({ path: `Frieren\\${name}`, name, folder: 'Frieren', inProgress });

  it('prefers a finished copy, whichever order they are found in', () => {
    const unfinished = file('Frieren - 03 (720p).mkv', true);
    const finished = file('Frieren - 03 (1080p).mkv', false);

    expect(matchSeriesFiles(series, [unfinished, finished]).get(3)).toBe(finished);
    expect(matchSeriesFiles(series, [finished, unfinished]).get(3)).toBe(finished);
  });

  it('keeps the first copy when both are finished', () => {
    const first = file('Frieren - 03 (720p).mkv', false);

    expect(matchSeriesFiles(series, [first, file('Frieren - 03 (1080p).mkv', false)]).get(3)).toBe(first);
  });
});

describe('hasFilesNamingSeries', () => {
  const secondSeason = { id: 2, title: 'Show Season 2', romajiTitle: 'Show Season 2', released: 12 };

  const looseFile = (name) => ({ path: `Other\\${name}`, name, folder: 'Other', inProgress: false });

  it('finds continued-numbering files that match no episode until the offset is known', () => {
    const files = [looseFile('[SubsPlease] Show - 13 (1080p).mkv')];

    expect(matchSeriesFiles(secondSeason, files).size).toBe(0);
    expect(hasFilesNamingSeries(secondSeason, files)).toBe(true);
    expect([...matchSeriesFiles(secondSeason, files, 12).keys()]).toEqual([1]);
  });

  it('finds files in the show’s own folder whatever they are called', () => {
    const file = { path: 'Show Season 2\\01.mkv', name: '01.mkv', folder: 'Show Season 2', inProgress: false };

    expect(hasFilesNamingSeries(secondSeason, [file])).toBe(true);
  });

  it('recognises a folder that still ends in a dot, before it has been renamed', () => {
    const movie = { id: 3, title: 'Your Name.', romajiTitle: 'Kimi no Na wa.', released: 1 };
    const file = { path: 'Your Name.\\movie.mkv', name: 'movie.mkv', folder: 'Your Name.', inProgress: false };

    expect(hasFilesNamingSeries(movie, [file])).toBe(true);
    expect([...matchSeriesFiles(movie, [file]).keys()]).toEqual([1]);
  });

  it('ignores files of other shows', () => {
    expect(hasFilesNamingSeries(secondSeason, [looseFile('[Group] Unrelated - 01.mkv')])).toBe(false);
  });
});
