import { beforeEach, describe, expect, it, vi } from 'vitest';

const getFileSizes = vi.hoisted(() => vi.fn());
const fetchKnownEpisodeOffset = vi.hoisted(() => vi.fn());
const loadSeries = vi.hoisted(() => vi.fn());
const getCachedSeries = vi.hoisted(() => vi.fn());

vi.mock('@/api/clients/desktopClient', () => ({ getFileSizes }));
vi.mock('@/api/services/seasonService', () => ({ fetchKnownEpisodeOffset }));
vi.mock('@/api/services/seriesRegistry', () => ({ loadSeries, getCachedSeries }));

const { findWatchedEpisodesToClean } = await import('@/api/services/watchedCleanupService');

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 10, 4);
const ROOT = 'D:\\Anime';

const SEASON_TWO = { id: 2, title: 'Frieren', romajiTitle: 'Sousou no Frieren', released: 12, format: 'TV' };
const FILE = { path: '[Group] Sousou no Frieren - 30.mkv', name: '[Group] Sousou no Frieren - 30.mkv', folder: '' };

const library = { watched: { 2: [2] }, watchDates: { '2-2': NOW - 40 * DAY_MS } };

const find = (overrides = {}) =>
  findWatchedEpisodesToClean({
    scan: { root: ROOT, files: [FILE] },
    library,
    fileLinks: {},
    afterDays: 30,
    now: NOW,
    ...overrides,
  });

describe('findWatchedEpisodesToClean', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getCachedSeries.mockReturnValue(SEASON_TWO);
    fetchKnownEpisodeOffset.mockResolvedValue(28);
    getFileSizes.mockResolvedValue({ [FILE.path]: 1400 });
  });

  it('applies the season offset and adds file sizes', async () => {
    const { candidates, skippedShows } = await find();

    expect(skippedShows).toBe(0);
    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({ path: FILE.path, episodeNumber: 2, bytes: 1400 });
  });

  it('leaves a show out rather than guessing, when its offset can’t be confirmed', async () => {
    fetchKnownEpisodeOffset.mockResolvedValue(undefined);

    await expect(find()).resolves.toEqual({ candidates: [], skippedShows: 1 });
    expect(getFileSizes).not.toHaveBeenCalled();
  });

  it('accepts a confirmed offset of zero for a first season', async () => {
    const firstEpisodeFile = { path: 'Frieren\\Frieren - 02.mkv', name: 'Frieren - 02.mkv', folder: 'Frieren' };

    fetchKnownEpisodeOffset.mockResolvedValue(0);
    getFileSizes.mockResolvedValue({ [firstEpisodeFile.path]: 700 });

    const { candidates } = await find({ scan: { root: ROOT, files: [firstEpisodeFile] } });

    expect(candidates).toHaveLength(1);
  });

  it('leaves a show out when its details can’t be loaded', async () => {
    getCachedSeries.mockReturnValue(undefined);

    await expect(find()).resolves.toEqual({ candidates: [], skippedShows: 1 });
  });

  it('looks nothing up when no episode is old enough', async () => {
    const recentLibrary = { watched: { 2: [2] }, watchDates: { '2-2': NOW - DAY_MS } };

    await expect(find({ library: recentLibrary })).resolves.toEqual({ candidates: [], skippedShows: 0 });
    expect(loadSeries).not.toHaveBeenCalled();
  });

  it('looks nothing up when the folder has no videos', async () => {
    await expect(find({ scan: { root: ROOT, files: [] } })).resolves.toEqual({ candidates: [], skippedShows: 0 });
    expect(loadSeries).not.toHaveBeenCalled();
  });

  it('skips the offset request for a show with no files', async () => {
    const otherFile = { path: 'Other\\Other - 02.mkv', name: 'Other - 02.mkv', folder: 'Other' };

    await expect(find({ scan: { root: ROOT, files: [otherFile] } })).resolves.toEqual({
      candidates: [],
      skippedShows: 0,
    });

    expect(fetchKnownEpisodeOffset).not.toHaveBeenCalled();
  });
});
