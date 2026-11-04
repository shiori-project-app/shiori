import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const findEpisodeTorrent = vi.hoisted(() => vi.fn());
const openMagnetInTorrentApp = vi.hoisted(() => vi.fn());
const refreshSeries = vi.hoisted(() => vi.fn());

vi.mock('@/api/services/animeHeavenService', () => ({ fetchEpisodes: vi.fn() }));
vi.mock('@/api/services/seasonService', () => ({ fetchEpisodeOffset: async () => 0 }));
vi.mock('@/api/services/seriesRegistry', () => ({ refreshSeries }));
vi.mock('@/api/services/subsPleaseService', () => ({}));
vi.mock('@/api/services/torrentService', () => ({ findEpisodeTorrent, openMagnetInTorrentApp }));

const { checkTrackedShow } = await import('@/api/services/trackingService');

const SERIES = { id: 7, title: 'Backlog Show', romajiTitle: 'Backlog Show', released: 4 };

const check = (extra = {}) =>
  checkTrackedShow({
    seriesId: SERIES.id,
    entry: { source: 'nyaa', fromEpisode: 1, handled: [] },
    files: [],
    downloads: [],
    queueEpisodes: () => {},
    ...extra,
  });

describe('checkTrackedShow with a backlog', () => {
  beforeEach(() => {
    refreshSeries.mockResolvedValue([SERIES]);
    openMagnetInTorrentApp.mockResolvedValue(undefined);
  });

  afterEach(() => {
    findEpisodeTorrent.mockReset();
    openMagnetInTorrentApp.mockReset();
  });

  it('keeps the record of episodes already sent when a later one fails, and stops there', async () => {
    findEpisodeTorrent.mockImplementation(async (_series, episodeNumber) => {
      if (episodeNumber === 3) throw new Error('Nyaa said 429');

      return { magnet: `magnet:${episodeNumber}` };
    });

    const result = await check();

    expect(result.done).toEqual([1, 2]);
    expect(result.waitingForRelease).toBe(true);
    expect(result.message).toMatch(/Got EP 1, 2/);
    expect(result.message).toMatch(/Nyaa said 429/);
    expect(findEpisodeTorrent).toHaveBeenCalledTimes(3);
  });

  it('counts an episode as sent only after the torrent app accepted it', async () => {
    findEpisodeTorrent.mockImplementation(async (_series, episodeNumber) => ({ magnet: `magnet:${episodeNumber}` }));
    openMagnetInTorrentApp.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('qBittorrent is missing'));

    expect((await check()).done).toEqual([1]);
  });

  it('still reports a failed check when nothing was sent at all', async () => {
    findEpisodeTorrent.mockRejectedValue(new Error('Nyaa is down'));
    await expect(check()).rejects.toThrow('Nyaa is down');
  });

  it('never downloads an episode the user linked to a file by hand', async () => {
    findEpisodeTorrent.mockImplementation(async (_series, episodeNumber) => ({ magnet: `magnet:${episodeNumber}` }));

    const linkedFile = { path: 'stuff\\mine.mkv', name: 'mine.mkv', folder: 'stuff', inProgress: false };

    const result = await check({
      files: [linkedFile],
      root: 'D:\\Anime',
      fileLinks: { [SERIES.id]: { folders: [], episodes: { 2: `D:\\Anime\\${linkedFile.path}` } } },
    });

    expect(result.done).toEqual([1, 3, 4]);
  });

  it('skips episodes with no torrent yet and carries on', async () => {
    findEpisodeTorrent.mockImplementation(async (_series, episodeNumber) =>
      episodeNumber === 2 ? null : { magnet: `magnet:${episodeNumber}` },
    );

    const result = await check();

    expect(result.done).toEqual([1, 3, 4]);
    expect(result.message).toMatch(/1 episode not available yet/);
  });
});
