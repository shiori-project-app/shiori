import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const anilistQueryMock = vi.hoisted(() => vi.fn());

vi.mock('@/api/clients/anilistClient', () => ({ anilistQuery: anilistQueryMock }));

const media = (id) => ({
  id,
  idMal: id * 10,
  title: { english: `Show ${id}`, romaji: `Show ${id}`, native: '' },
  genres: [],
  status: 'FINISHED',
  episodes: 12,
  startDate: { year: 2024, month: 1, day: 1 },
  endDate: { year: 2024, month: 3, day: 25 },
  studios: { nodes: [] },
  coverImage: { large: `https://s4.anilist.co/cover/${id}.jpg`, extraLarge: '' },
  bannerImage: 'https://s4.anilist.co/banner.jpg',
  relations: { edges: [] },
  streamingEpisodes: [],
});

const savedEntryFor = (id, extra = {}) => ({
  series: { id, malId: id * 10, title: `Saved ${id}`, cover: `https://s4.anilist.co/cover/${id}.jpg`, released: 12 },
  episodeOffset: 24,
  episodeTitles: { 3: 'Saved name' },
  episodeTitlesUpTo: 12,
  savedAt: 1,
  ...extra,
});

const fakeDesktop = (savedSeries = {}, skipTimes = {}) => ({
  loadOfflineLibrary: vi.fn(async () => ({ series: savedSeries, skipTimes })),
  saveOfflineSeries: vi.fn(async () => {}),
  removeOfflineSeries: vi.fn(async () => {}),
  saveOfflineSkipTimes: vi.fn(async () => {}),
});

const freshModules = async () => {
  vi.resetModules();

  return {
    registry: await import('@/api/services/seriesRegistry'),
    episodes: await import('@/api/services/episodeService'),
    seasons: await import('@/api/services/seasonService'),
    skips: await import('@/api/services/skipService'),
  };
};

const networkDown = () => Promise.reject(new TypeError('Failed to fetch'));

describe('offline fallbacks', () => {
  beforeEach(() => {
    anilistQueryMock.mockReset();
    vi.stubGlobal('fetch', vi.fn(networkDown));
  });

  afterEach(() => {
    delete window.shiori;
    vi.unstubAllGlobals();
  });

  it('serves the saved copy with its saved cover when AniList is unreachable', async () => {
    window.shiori = fakeDesktop({ 7: savedEntryFor(7) });
    anilistQueryMock.mockImplementation(networkDown);

    const { registry } = await freshModules();
    const series = await registry.fetchSeries(7);

    expect(series).toMatchObject({ id: 7, title: 'Saved 7', isOfflineCopy: true, banner: null });
    expect(series.cover).toBe('shiori-media://cover/7');
  });

  it('still fails for a show that was never saved', async () => {
    window.shiori = fakeDesktop();
    anilistQueryMock.mockImplementation(networkDown);

    const { registry } = await freshModules();

    await expect(registry.fetchSeries(8)).rejects.toThrow('Failed to fetch');
  });

  it('fills a list with whatever was saved', async () => {
    window.shiori = fakeDesktop({ 7: savedEntryFor(7) });
    anilistQueryMock.mockImplementation(networkDown);

    const { registry } = await freshModules();

    await registry.loadSeries([7, 8]);

    expect(registry.getCachedSeries(7).title).toBe('Saved 7');
    expect(registry.getCachedSeries(8)).toBeUndefined();
  });

  it('refreshes the saved copy when the show loads online, and prefers the live copy', async () => {
    window.shiori = fakeDesktop({ 7: savedEntryFor(7) });
    anilistQueryMock.mockResolvedValue({ Page: { media: [media(7)] } });

    const { registry } = await freshModules();
    const { loadOfflineStore } = await import('@/api/services/offlineStore');

    await loadOfflineStore();

    const series = await registry.fetchSeries(7);

    expect(series.title).toBe('Show 7');
    expect(series.isOfflineCopy).toBeUndefined();

    const [savedEntry] = window.shiori.saveOfflineSeries.mock.calls[0];

    expect(savedEntry).toMatchObject({
      series: { title: 'Show 7' },
      episodeOffset: 24,
      episodeTitles: { 3: 'Saved name' },
    });
  });

  describe('when a saved copy is recent enough', () => {
    const recentlySavedEntry = (id, seriesExtra = {}) =>
      savedEntryFor(id, {
        series: {
          id,
          malId: id * 10,
          title: `Saved ${id}`,
          cover: 'https://s4.anilist.co/c.jpg',
          status: 'Finished',
          ...seriesExtra,
        },

        savedAt: Date.now(),
        seriesFetchedAt: Date.now(),
      });

    const setOnline = (isOnline) => vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(isOnline);

    afterEach(() => vi.restoreAllMocks());

    it('uses it without asking AniList, keeping its online images', async () => {
      setOnline(true);
      window.shiori = fakeDesktop({ 7: recentlySavedEntry(7) });

      const { registry } = await freshModules();
      const series = await registry.fetchSeries(7);

      expect(anilistQueryMock).not.toHaveBeenCalled();
      expect(series.title).toBe('Saved 7');
      expect(series.cover).toBe('https://s4.anilist.co/c.jpg');
      expect(series.isOfflineCopy).toBeUndefined();
    });

    it('asks only for the shows it does not have', async () => {
      setOnline(true);
      window.shiori = fakeDesktop({ 7: recentlySavedEntry(7) });
      anilistQueryMock.mockResolvedValue({ Page: { media: [media(8)] } });

      const { registry } = await freshModules();

      await registry.loadSeries([7, 8]);

      expect(anilistQueryMock).toHaveBeenCalledTimes(1);
      expect(anilistQueryMock.mock.calls[0][1]).toEqual({ ids: [8] });
      expect(registry.getCachedSeries(7).title).toBe('Saved 7');
      expect(registry.getCachedSeries(8).title).toBe('Show 8');
    });

    it('asks AniList once its next episode has aired, so the new episode shows up', async () => {
      setOnline(true);

      window.shiori = fakeDesktop({
        7: recentlySavedEntry(7, { status: 'Airing', nextAiringAt: Date.now() / 1000 - 60 }),
      });

      anilistQueryMock.mockResolvedValue({ Page: { media: [media(7)] } });

      const { registry } = await freshModules();

      expect((await registry.fetchSeries(7)).title).toBe('Show 7');
      expect(anilistQueryMock).toHaveBeenCalledTimes(1);
    });

    it('uses the offline copy with its saved cover while offline, because online images would break', async () => {
      setOnline(false);
      window.shiori = fakeDesktop({ 7: recentlySavedEntry(7) });
      anilistQueryMock.mockImplementation(networkDown);

      const { registry } = await freshModules();
      const series = await registry.fetchSeries(7);

      expect(series.isOfflineCopy).toBe(true);
      expect(series.cover).toBe('shiori-media://cover/7');
    });

    describe('a list that may be out of date', () => {
      const listMedia = (id, extra = {}) => ({ ...media(id), status: 'RELEASING', episodes: null, ...extra });

      const airingAtMinutesFromNow = (episode, minutes) => ({
        nextAiringEpisode: { episode, airingAt: Math.floor(Date.now() / 1000) + minutes * 60 },
      });

      it('does not replace a copy that has more episodes', async () => {
        setOnline(true);
        window.shiori = fakeDesktop();
        anilistQueryMock.mockResolvedValue({ Page: { media: [listMedia(7, airingAtMinutesFromNow(6, 60))] } });

        const { registry } = await freshModules();

        await registry.loadSeries([7]);
        expect(registry.getCachedSeries(7).released).toBe(5);

        const shown = registry.rememberMedia(listMedia(7, airingAtMinutesFromNow(5, 60)));

        expect(shown.released).toBe(5);
        expect(registry.getCachedSeries(7).released).toBe(5);
      });

      it('does not count as loaded once its next episode has aired, so opening the show asks again', async () => {
        setOnline(true);
        window.shiori = fakeDesktop();
        anilistQueryMock.mockResolvedValue({ Page: { media: [listMedia(7, airingAtMinutesFromNow(6, 60))] } });

        const { registry } = await freshModules();

        registry.rememberMedia(listMedia(7, airingAtMinutesFromNow(5, -10)));
        expect(registry.getCachedSeries(7)).toBeUndefined();

        expect((await registry.fetchSeries(7)).released).toBe(5);
        expect(anilistQueryMock).toHaveBeenCalledTimes(1);
      });

      it('still loads a show requested by id, even if AniList has not caught up on its airing time', async () => {
        setOnline(true);
        window.shiori = fakeDesktop();
        anilistQueryMock.mockResolvedValue({ Page: { media: [listMedia(7, airingAtMinutesFromNow(5, -10))] } });

        const { registry } = await freshModules();

        expect((await registry.fetchSeries(7)).id).toBe(7);
      });

      it('does not block the saved cover while offline', async () => {
        setOnline(false);
        window.shiori = fakeDesktop({ 7: recentlySavedEntry(7) });
        anilistQueryMock.mockImplementation(networkDown);

        const { registry } = await freshModules();

        registry.rememberMedia(listMedia(7));

        expect((await registry.fetchSeries(7)).cover).toBe('shiori-media://cover/7');
      });
    });

    it('counts a fetch as recent, so the show is not asked for again next launch', async () => {
      setOnline(true);
      window.shiori = fakeDesktop({ 7: savedEntryFor(7) });
      anilistQueryMock.mockResolvedValue({ Page: { media: [media(7)] } });

      const { registry } = await freshModules();
      const { loadOfflineStore } = await import('@/api/services/offlineStore');

      await loadOfflineStore();
      await registry.fetchSeries(7);

      const [savedEntry] = window.shiori.saveOfflineSeries.mock.calls[0];

      expect(savedEntry.savedAt).toBe(1);
      expect(savedEntry.seriesFetchedAt).toBeGreaterThan(1);
    });
  });

  it('uses saved episode names, episode offset and skip times offline', async () => {
    const savedSkip = [{ skipType: 'op', interval: { startTime: 60, endTime: 150 } }];

    window.shiori = fakeDesktop({ 7: savedEntryFor(7) }, { '70:3': savedSkip });
    anilistQueryMock.mockImplementation(networkDown);

    const { episodes, seasons, skips } = await freshModules();
    const titles = await episodes.fetchEpisodeTitles({ id: 7, malId: 70, streamingEpisodes: {} }, 1, 12);

    expect(titles).toEqual({ 3: 'Saved name' });
    expect(await seasons.fetchEpisodeOffset(7)).toBe(24);
    expect(await skips.fetchSkipTimes(70, 3)).toEqual(savedSkip);
    expect(await skips.fetchSkipTimes(70, 4)).toEqual([]);
  });
});
