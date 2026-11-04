import { describe, expect, it } from 'vitest';
import {
  directoryOf,
  filesMatchingSearch,
  foldersOfFiles,
  isLinkableEpisode,
  linksOfSeries,
  locationInRoot,
  matchLinkedSeriesFiles,
  pathInsideRoot,
  suggestedEpisodeForFile,
  withEpisodeFileLinked,
  withEpisodeFileUnlinked,
  withFolderLinked,
  withFolderUnlinked,
} from '@/utils/fileLinks';

const ROOT = 'D:\\Anime';
const SERIES = { id: 7, title: 'Frieren', romajiTitle: 'Sousou no Frieren', released: 12 };
const NO_LINKS = { folders: [], episodes: {} };

const file = (relativePath, extra = {}) => ({
  path: relativePath,
  name: relativePath.split('\\').at(-1),
  folder: relativePath.includes('\\') ? relativePath.split('\\')[0] : '',
  inProgress: false,
  ...extra,
});

const inRoot = (relativePath) => `${ROOT}\\${relativePath}`;

const folderLinks = (...folders) => ({ folders: folders.map(inRoot), episodes: {} });

const episodeLinks = (episodes) => ({
  folders: [],
  episodes: Object.fromEntries(Object.entries(episodes).map(([number, path]) => [number, inRoot(path)])),
});

const matched = (files, links, { offset = 0, series = SERIES, root = ROOT } = {}) =>
  Object.fromEntries(
    [...matchLinkedSeriesFiles(series, files, offset, links, root)].map(([episodeNumber, { path }]) => [
      episodeNumber,
      path,
    ]),
  );

describe('changing links', () => {
  it('starts with nothing linked', () => {
    expect(linksOfSeries({}, SERIES.id)).toEqual(NO_LINKS);
    expect(linksOfSeries(undefined, SERIES.id)).toEqual(NO_LINKS);
  });

  it('links and replaces one file per episode', () => {
    const links = withEpisodeFileLinked({}, 7, 3, 'a.mkv');

    expect(links[7].episodes).toEqual({ 3: 'a.mkv' });
    expect(withEpisodeFileLinked(links, 7, 3, 'b.mkv')[7].episodes).toEqual({ 3: 'b.mkv' });
  });

  it('links a folder only once', () => {
    const links = withFolderLinked(withFolderLinked({}, 7, 'Show'), 7, 'Show');

    expect(links[7].folders).toEqual(['Show']);
  });

  it('forgets a show once its last link is gone', () => {
    expect(withEpisodeFileUnlinked(withEpisodeFileLinked({}, 7, 3, 'a.mkv'), 7, 3)).toEqual({});
    expect(withFolderUnlinked(withFolderLinked({}, 7, 'Show'), 7, 'Show')).toEqual({});
  });

  it('leaves other shows and other links alone', () => {
    const links = withEpisodeFileLinked(
      withEpisodeFileLinked({ 9: { folders: ['Other'], episodes: {} } }, 7, 1, 'a'),
      7,
      2,
      'b',
    );

    const afterUnlink = withEpisodeFileUnlinked(links, 7, 1);

    expect(afterUnlink[7].episodes).toEqual({ 2: 'b' });
    expect(afterUnlink[9].folders).toEqual(['Other']);
  });
});

describe('locations', () => {
  it('joins and splits a root and a relative path', () => {
    expect(locationInRoot('D:\\Anime', 'Show\\Ep 01.mkv')).toBe('D:\\Anime\\Show\\Ep 01.mkv');
    expect(pathInsideRoot('D:\\Anime', 'D:\\Anime\\Show\\Ep 01.mkv')).toBe('Show\\Ep 01.mkv');
  });

  it('handles a drive root without doubling the separator', () => {
    expect(locationInRoot('D:\\', 'Ep 01.mkv')).toBe('D:\\Ep 01.mkv');
    expect(locationInRoot('/', 'Ep 01.mkv')).toBe('/Ep 01.mkv');
    expect(locationInRoot('/home/me/Anime', 'Show/Ep 01.mkv')).toBe('/home/me/Anime/Show/Ep 01.mkv');
    expect(pathInsideRoot('/home/me/Anime', '/home/me/Anime/Show/Ep 01.mkv')).toBe('Show/Ep 01.mkv');
    expect(locationInRoot('/home/me/odd\\name', 'Ep 01.mkv')).toBe('/home/me/odd\\name/Ep 01.mkv');
  });

  it('shows the full location of something outside the current root', () => {
    expect(pathInsideRoot('E:\\Videos', 'D:\\Anime\\Ep 01.mkv')).toBe('D:\\Anime\\Ep 01.mkv');
  });

  it('finds a file’s folder at any depth, and none for a loose file', () => {
    expect(directoryOf(file('A\\B\\Ep 01.mkv'))).toBe('A\\B');
    expect(directoryOf(file('Ep 01.mkv'))).toBe('');
  });
});

describe('matchLinkedSeriesFiles: links to one file', () => {
  it('matches like normal when nothing is linked', () => {
    expect(matched([file('Frieren\\Frieren - 03.mkv')], NO_LINKS)).toEqual({ 3: 'Frieren\\Frieren - 03.mkv' });
  });

  it('accepts any file at all, because the choice is the user’s', () => {
    const files = [file('random stuff\\holiday video.mkv')];

    expect(matched(files, NO_LINKS)).toEqual({});

    expect(matched(files, episodeLinks({ 4: 'random stuff\\holiday video.mkv' }))).toEqual({
      4: 'random stuff\\holiday video.mkv',
    });
  });

  it('lets a chosen file beat an automatic match for the same episode', () => {
    const files = [file('Frieren\\Frieren - 03.mkv'), file('keep\\better copy.mkv')];

    expect(matched(files, episodeLinks({ 3: 'keep\\better copy.mkv' }))).toEqual({ 3: 'keep\\better copy.mkv' });
  });

  it('ignores a link whose file is gone, so the episode shows as missing', () => {
    expect(matched([], episodeLinks({ 3: 'gone.mkv' }))).toEqual({});
  });

  it('does not attach to a same-named file after the download folder changes', () => {
    const files = [file('Ep 01.mkv')];
    const links = episodeLinks({ 1: 'Ep 01.mkv' });

    expect(matched(files, links)).toEqual({ 1: 'Ep 01.mkv' });
    expect(matched(files, links, { root: 'E:\\Videos' })).toEqual({});
  });

  it('never lets an unfinished file hide a finished one', () => {
    const files = [file('Frieren\\Frieren - 03.mkv'), file('keep\\partial.mkv', { inProgress: true })];

    expect(matched(files, episodeLinks({ 3: 'keep\\partial.mkv' }))).toEqual({ 3: 'Frieren\\Frieren - 03.mkv' });
  });
});

describe('matchLinkedSeriesFiles: linked folders', () => {
  it('reads episode numbers from the files directly inside', () => {
    const files = [file('My Rips\\Ep 01.mkv'), file('My Rips\\Ep 02.mkv'), file('Not Linked\\Ep 03.mkv')];

    expect(matched(files, folderLinks('My Rips'))).toEqual({ 1: 'My Rips\\Ep 01.mkv', 2: 'My Rips\\Ep 02.mkv' });
  });

  it('leaves out other shows and extras in subfolders', () => {
    const files = [
      file('Anime\\Bocchi\\Ep 01.mkv'),
      file('Anime\\Frieren Rips\\Ep 01.mkv'),
      file('Anime\\Frieren Rips\\Extras\\NCOP 01.mkv'),
    ];

    expect(matched(files, folderLinks('Anime\\Frieren Rips'))).toEqual({ 1: 'Anime\\Frieren Rips\\Ep 01.mkv' });
    expect(matched(files, folderLinks('Anime'))).toEqual({});
  });

  it('keeps per-season numbering when the numbers fit this season', () => {
    const secondSeason = { ...SERIES, released: 24 };
    const files = Array.from({ length: 24 }, (_, index) => file(`Rips\\Ep ${String(index + 1).padStart(2, '0')}.mkv`));
    const episodes = matched(files, folderLinks('Rips'), { offset: 12, series: secondSeason });

    expect(Object.keys(episodes)).toHaveLength(24);
    expect(episodes[13]).toBe('Rips\\Ep 13.mkv');
    expect(episodes[1]).toBe('Rips\\Ep 01.mkv');
  });

  it('renumbers a folder whose numbers run past this season', () => {
    expect(matched([file('Rips\\Ep 13.mkv')], folderLinks('Rips'), { offset: 12 })).toEqual({ 1: 'Rips\\Ep 13.mkv' });
  });

  it('renumbers files named after the folder too', () => {
    const season = { ...SERIES, title: 'Sousou no Frieren 2nd Season', romajiTitle: 'Frieren Season 2', released: 10 };

    expect(
      matched([file('Frieren\\Frieren - 29.mkv')], folderLinks('Frieren'), { offset: 28, series: season }),
    ).toEqual({ 1: 'Frieren\\Frieren - 29.mkv' });
  });

  it('accepts a movie whatever number its name contains', () => {
    const movie = { ...SERIES, title: 'Akira', romajiTitle: 'Akira', released: 1 };

    expect(matched([file('Films\\Akira.1988.mkv')], folderLinks('Films'), { series: movie })[1]).toBe(
      'Films\\Akira.1988.mkv',
    );

    expect(matched([file('Films\\the movie.mkv')], folderLinks('Films'), { series: movie })).toEqual({
      1: 'Films\\the movie.mkv',
    });
  });

  it('prefers a finished movie file over an unfinished one', () => {
    const movie = { ...SERIES, title: 'Akira', romajiTitle: 'Akira', released: 1 };
    const files = [file('Films\\new.mkv', { inProgress: true }), file('Films\\old.mkv')];

    expect(matched(files, folderLinks('Films'), { series: movie })).toEqual({ 1: 'Films\\old.mkv' });
  });

  it('never lets an unfinished file in a folder hide a finished automatic match', () => {
    const files = [file('Frieren\\Frieren - 03.mkv'), file('Rips\\Ep 03.mkv', { inProgress: true })];

    expect(matched(files, folderLinks('Rips'))).toEqual({ 3: 'Frieren\\Frieren - 03.mkv' });
  });

  it('lets a finished file in a folder replace an unfinished automatic match', () => {
    const files = [file('Frieren\\Frieren - 03.mkv', { inProgress: true }), file('Rips\\Ep 03.mkv')];

    expect(matched(files, folderLinks('Rips'))).toEqual({ 3: 'Rips\\Ep 03.mkv' });
  });

  it('lets a chosen file beat a linked folder', () => {
    const files = [file('My Rips\\Ep 01.mkv'), file('keep\\fixed.mkv')];
    const links = { ...folderLinks('My Rips'), ...episodeLinks({ 1: 'keep\\fixed.mkv' }) };

    expect(matched(files, links)).toEqual({ 1: 'keep\\fixed.mkv' });
  });
});

describe('choosing files', () => {
  const files = [
    file('Anime\\Season 1\\Frieren 01.mkv'),
    file('Anime\\Season 2\\Frieren 01.mkv'),
    file('Videos\\holiday.mp4'),
    file('Anime\\Frieren 02.mkv', { inProgress: true }),
    file('loose.mkv'),
  ];

  it('searches the whole path, ignoring case and unfinished files', () => {
    expect(filesMatchingSearch(files, ' SEASON 2 ').map(({ path }) => path)).toEqual([
      'Anime\\Season 2\\Frieren 01.mkv',
    ]);

    expect(filesMatchingSearch(files, 'videos').map(({ name }) => name)).toEqual(['holiday.mp4']);
    expect(filesMatchingSearch(files, '')).toHaveLength(4);
  });

  it('counts files directly in each folder, sorted, leaving out loose files', () => {
    expect(foldersOfFiles(files)).toEqual([
      { folder: 'Anime', fileCount: 1 },
      { folder: 'Anime\\Season 1', fileCount: 1 },
      { folder: 'Anime\\Season 2', fileCount: 1 },
      { folder: 'Videos', fileCount: 1 },
    ]);
  });

  it('suggests the episode being viewed, then the number in the name, then the first', () => {
    expect(suggestedEpisodeForFile(file('Show - 05.mkv'), SERIES, 9)).toBe(9);
    expect(suggestedEpisodeForFile(file('Show - 05.mkv'), SERIES)).toBe(5);
    expect(suggestedEpisodeForFile(file('Show - 99.mkv'), SERIES)).toBe(1);
    expect(suggestedEpisodeForFile(file('nothing.mkv'), SERIES)).toBe(1);
  });

  it('suggests the right episode for continued numbering', () => {
    expect(suggestedEpisodeForFile(file('Ep 14.mkv'), SERIES, undefined, 12)).toBe(2);
    expect(suggestedEpisodeForFile(file('Ep 05.mkv'), SERIES, undefined, 12)).toBe(5);
  });

  it('only accepts released whole episode numbers', () => {
    expect(isLinkableEpisode(1, SERIES)).toBe(true);
    expect(isLinkableEpisode(12, SERIES)).toBe(true);
    [0, 13, 1.5, NaN].forEach((episodeNumber) => expect(isLinkableEpisode(episodeNumber, SERIES)).toBe(false));
  });
});
