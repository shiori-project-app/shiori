import { afterEach, describe, expect, it, vi } from 'vitest';

const refreshSeriesMock = vi.hoisted(() => vi.fn());
const requestEpisodeTitlesMock = vi.hoisted(() => vi.fn());
const requestSkipTimesMock = vi.hoisted(() => vi.fn());
const fetchKnownEpisodeOffset = vi.hoisted(() => vi.fn(async () => 12));

vi.mock('@/api/services/seriesRegistry', () => ({ refreshSeries: refreshSeriesMock }));
vi.mock('@/api/services/episodeService', () => ({ requestEpisodeTitles: requestEpisodeTitlesMock }));
vi.mock('@/api/services/skipService', () => ({ requestSkipTimes: requestSkipTimesMock }));
vi.mock('@/api/services/seasonService', () => ({ fetchKnownEpisodeOffset }));
vi.mock('@/utils/async', async (importOriginal) => ({ ...(await importOriginal()), sleep: async () => {} }));

const { requestOfflineSync } = await import('@/api/services/offlineSyncService');
const { loadOfflineStore, savedEntries } = await import('@/api/services/offlineStore');

const series = (id, extra = {}) => ({
  id,
  malId: id * 10,
  title: `Show ${id}`,
  romajiTitle: `Show ${id}`,
  released: 3,
  ...extra,
});

const fakeDesktop = (savedSeries) => ({
  loadOfflineLibrary: vi.fn(async () => ({ series: savedSeries, skipTimes: {} })),
  saveOfflineSeries: vi.fn(async () => {}),
  removeOfflineSeries: vi.fn(async () => {}),
  saveOfflineSkipTimes: vi.fn(async () => {}),
});

describe('offline sync', () => {
  afterEach(() => delete window.shiori);

  it('saves new shows with names and offset, drops unneeded ones, and saves skip times for downloads', async () => {
    window.shiori = fakeDesktop({ 9: { series: series(9), episodeOffset: 0, savedAt: Date.now() } });
    refreshSeriesMock.mockResolvedValue([series(1, { hasPrequel: true })]);
    requestEpisodeTitlesMock.mockResolvedValue({ 1: 'First', 2: 'Second' });
    requestSkipTimesMock.mockResolvedValue([{ skipType: 'op' }]);
    await loadOfflineStore();

    await requestOfflineSync({
      list: { 1: { status: 'watching' } },
      history: [],
      tracked: {},
      downloads: [],
      files: [{ path: 'Show 1\\Show 1 - 02.mp4', folder: 'Show 1', name: 'Show 1 - 02.mp4', inProgress: false }],
    });

    expect(window.shiori.removeOfflineSeries).toHaveBeenCalledWith([9]);
    expect(refreshSeriesMock).toHaveBeenCalledWith([1]);

    expect(savedEntries()[1]).toMatchObject({
      episodeOffset: 12,
      episodeTitles: { 1: 'First', 2: 'Second' },
      episodeTitlesUpTo: 3,
    });

    expect(requestSkipTimesMock).toHaveBeenCalledWith(10, 2);
    expect(window.shiori.saveOfflineSkipTimes).toHaveBeenCalledWith('10:2', [{ skipType: 'op' }]);
  });

  it('saves nothing for a show whose season offset could not be found, instead of saving a wrong 0', async () => {
    window.shiori = fakeDesktop({});
    refreshSeriesMock.mockResolvedValue([series(2, { hasPrequel: true })]);
    fetchKnownEpisodeOffset.mockResolvedValueOnce(null);
    await loadOfflineStore();

    await requestOfflineSync({
      list: { 2: { status: 'watching' } },
      history: [],
      tracked: {},
      downloads: [],
      files: [],
    });

    expect(savedEntries()[2]).toBeUndefined();
    expect(window.shiori.saveOfflineSeries).not.toHaveBeenCalled();
  });
});
