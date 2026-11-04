import { afterEach, describe, expect, it, vi } from 'vitest';

const anilistQueryMock = vi.hoisted(() => vi.fn());

vi.mock('@/api/clients/anilistClient', () => ({ anilistQuery: anilistQueryMock, forgetAniListResponses: vi.fn() }));

const media = (id) => ({
  id,
  idMal: null,
  title: { english: `Show ${id}`, romaji: `Show ${id}`, native: '' },
  status: 'FINISHED',
  episodes: 12,
  studios: { nodes: [] },
  coverImage: { large: '', extraLarge: '' },
  relations: { edges: [] },
});

describe('clearing saved AniList data', () => {
  afterEach(() => delete window.shiori);

  it('clears the files, forgets loaded shows and empties the offline store', async () => {
    window.shiori = {
      clearAniListData: vi.fn(async () => {}),
      saveOfflineSeries: vi.fn(async () => {}),
      loadOfflineLibrary: vi.fn(async () => ({ series: { 1: { series: { id: 1 } } }, skipTimes: {} })),
    };

    anilistQueryMock.mockResolvedValue({ Page: { media: [media(1)] } });

    const { clearSavedAniListData } = await import('@/api/services/cacheService');
    const { fetchSeries } = await import('@/api/services/seriesRegistry');

    const { loadOfflineStore, onOfflineStoreChange, savedEntries } = await import('@/api/services/offlineStore');

    await loadOfflineStore();
    await fetchSeries(1);

    const storeChanged = vi.fn();

    onOfflineStoreChange(storeChanged);

    await clearSavedAniListData();
    await fetchSeries(1);

    expect(window.shiori.clearAniListData).toHaveBeenCalledOnce();
    expect(anilistQueryMock).toHaveBeenCalledTimes(2);
    expect(savedEntries()).toEqual({});
    expect(storeChanged).toHaveBeenCalledOnce();
  });
});
