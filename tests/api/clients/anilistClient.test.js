import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const HOUR_MS = 60 * 60 * 1000;
const NOW = Date.UTC(2026, 10, 4);
const QUERY = 'query { Page { media { id } } }';
const FRESH_DATA = { Page: { media: [{ id: 2 }] } };
const SAVED_DATA = { Page: { media: [{ id: 1 }] } };

const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), { status });

const fakeDesktop = (savedResponse = null) => ({
  readAniListResponse: vi.fn(async () => savedResponse),
  saveAniListResponse: vi.fn(async () => {}),
});

const savedHoursAgo = (hours) => ({ data: SAVED_DATA, savedAt: NOW - hours * HOUR_MS });

const freshClient = async () => {
  vi.resetModules();

  return import('@/api/clients/anilistClient');
};

const fetchMock = () => globalThis.fetch;

describe('anilistQuery saved responses', () => {
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(NOW);

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ data: FRESH_DATA })),
    );
  });

  afterEach(() => {
    delete window.shiori;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('answers from a saved response without asking AniList', async () => {
    window.shiori = fakeDesktop(savedHoursAgo(0.5));

    const { anilistQuery } = await freshClient();

    await expect(anilistQuery(QUERY, {}, { keepForMs: HOUR_MS })).resolves.toEqual(SAVED_DATA);
    expect(fetchMock()).not.toHaveBeenCalled();
    expect(window.shiori.saveAniListResponse).not.toHaveBeenCalled();
  });

  it('asks AniList once the saved response is too old, and saves the new one', async () => {
    window.shiori = fakeDesktop(savedHoursAgo(2));

    const { anilistQuery } = await freshClient();

    await expect(anilistQuery(QUERY, { page: 1 }, { keepForMs: HOUR_MS })).resolves.toEqual(FRESH_DATA);
    expect(fetchMock()).toHaveBeenCalledTimes(1);

    expect(window.shiori.saveAniListResponse).toHaveBeenCalledExactlyOnceWith(
      `${QUERY}${JSON.stringify({ page: 1 })}`,
      FRESH_DATA,
    );
  });

  it('asks AniList when nothing was saved', async () => {
    window.shiori = fakeDesktop();

    const { anilistQuery } = await freshClient();

    await expect(anilistQuery(QUERY, {}, { keepForMs: HOUR_MS })).resolves.toEqual(FRESH_DATA);
  });

  it('keeps separate answers for different variables', async () => {
    window.shiori = fakeDesktop();

    const { anilistQuery } = await freshClient();

    await anilistQuery(QUERY, { page: 1 }, { keepForMs: HOUR_MS });
    await anilistQuery(QUERY, { page: 2 }, { keepForMs: HOUR_MS });

    const readKeys = window.shiori.readAniListResponse.mock.calls.map(([key]) => key);

    expect(new Set(readKeys).size).toBe(2);
  });

  it('falls back to an old response when AniList can’t be reached', async () => {
    window.shiori = fakeDesktop(savedHoursAgo(48));
    fetchMock().mockRejectedValue(new TypeError('Failed to fetch'));

    const { anilistQuery } = await freshClient();

    await expect(anilistQuery(QUERY, {}, { keepForMs: HOUR_MS })).resolves.toEqual(SAVED_DATA);
  });

  it('falls back to an old response when AniList answers with an error', async () => {
    window.shiori = fakeDesktop(savedHoursAgo(48));
    fetchMock().mockResolvedValue(jsonResponse({ data: null, errors: [{ message: 'Internal error' }] }, 500));

    const { anilistQuery } = await freshClient();

    await expect(anilistQuery(QUERY, {}, { keepForMs: HOUR_MS })).resolves.toEqual(SAVED_DATA);
  });

  it('falls back to the saved response when AniList answers with nulls and errors', async () => {
    window.shiori = fakeDesktop(savedHoursAgo(48));

    fetchMock().mockResolvedValue(jsonResponse({ data: { Media: null }, errors: [{ message: 'Not Found.' }] }));

    const { anilistQuery } = await freshClient();

    await expect(anilistQuery(QUERY, {}, { keepForMs: HOUR_MS })).resolves.toEqual(SAVED_DATA);
    expect(window.shiori.saveAniListResponse).not.toHaveBeenCalled();
  });

  it('asks again after a fallback, so old data does not stick once AniList recovers', async () => {
    window.shiori = fakeDesktop(savedHoursAgo(48));
    fetchMock().mockRejectedValueOnce(new TypeError('Failed to fetch'));

    const { anilistQuery } = await freshClient();

    await expect(anilistQuery(QUERY, {}, { keepForMs: HOUR_MS })).resolves.toEqual(SAVED_DATA);
    await expect(anilistQuery(QUERY, {}, { keepForMs: HOUR_MS })).resolves.toEqual(FRESH_DATA);
  });

  it('asks again after a response with errors, instead of keeping it for the session', async () => {
    window.shiori = fakeDesktop();
    fetchMock().mockResolvedValueOnce(jsonResponse({ data: FRESH_DATA, errors: [{ message: 'Partly failed' }] }));

    const { anilistQuery } = await freshClient();

    await anilistQuery(QUERY, {}, { keepForMs: HOUR_MS });
    await anilistQuery(QUERY, {}, { keepForMs: HOUR_MS });

    expect(fetchMock()).toHaveBeenCalledTimes(2);
  });

  it('refreshes a response when the app has been left open past its lifetime', async () => {
    window.shiori = fakeDesktop();

    const { anilistQuery } = await freshClient();

    await anilistQuery(QUERY, {}, { keepForMs: HOUR_MS });
    await anilistQuery(QUERY, {}, { keepForMs: HOUR_MS });
    expect(fetchMock()).toHaveBeenCalledTimes(1);

    Date.now.mockReturnValue(NOW + HOUR_MS);
    await anilistQuery(QUERY, {}, { keepForMs: HOUR_MS });
    expect(fetchMock()).toHaveBeenCalledTimes(2);
  });

  it('still fails when nothing was ever saved', async () => {
    window.shiori = fakeDesktop();
    fetchMock().mockRejectedValue(new TypeError('Failed to fetch'));

    const { anilistQuery } = await freshClient();

    await expect(anilistQuery(QUERY, {}, { keepForMs: HOUR_MS })).rejects.toThrow('Failed to fetch');
  });

  it('never saves a response that came with errors, where parts may be missing', async () => {
    window.shiori = fakeDesktop();

    fetchMock().mockResolvedValue(jsonResponse({ data: FRESH_DATA, errors: [{ message: 'Partly failed' }] }));

    const { anilistQuery } = await freshClient();

    await expect(anilistQuery(QUERY, {}, { keepForMs: HOUR_MS })).resolves.toEqual(FRESH_DATA);
    expect(window.shiori.saveAniListResponse).not.toHaveBeenCalled();
  });

  it('doesn’t trust a response dated in the future, after the clock changed', async () => {
    window.shiori = fakeDesktop(savedHoursAgo(-5));

    const { anilistQuery } = await freshClient();

    await expect(anilistQuery(QUERY, {}, { keepForMs: HOUR_MS })).resolves.toEqual(FRESH_DATA);
  });

  it('asks AniList when the saved response can’t be read', async () => {
    window.shiori = fakeDesktop();
    window.shiori.readAniListResponse.mockRejectedValue(new Error('disk trouble'));

    const { anilistQuery } = await freshClient();

    await expect(anilistQuery(QUERY, {}, { keepForMs: HOUR_MS })).resolves.toEqual(FRESH_DATA);
  });

  it('returns the answer even when saving it fails', async () => {
    window.shiori = fakeDesktop();
    window.shiori.saveAniListResponse.mockRejectedValue(new Error('disk full'));

    const { anilistQuery } = await freshClient();

    await expect(anilistQuery(QUERY, {}, { keepForMs: HOUR_MS })).resolves.toEqual(FRESH_DATA);
  });

  it('leaves the disk alone for a query without a lifetime', async () => {
    window.shiori = fakeDesktop(savedHoursAgo(0.5));

    const { anilistQuery } = await freshClient();

    await expect(anilistQuery(QUERY)).resolves.toEqual(FRESH_DATA);
    expect(window.shiori.readAniListResponse).not.toHaveBeenCalled();
    expect(window.shiori.saveAniListResponse).not.toHaveBeenCalled();
  });

  it('skips saved responses for a request that needs the latest data', async () => {
    window.shiori = fakeDesktop(savedHoursAgo(0.5));

    const { anilistQuery } = await freshClient();

    await expect(anilistQuery(QUERY, {}, { cache: false, keepForMs: HOUR_MS })).resolves.toEqual(FRESH_DATA);
    expect(window.shiori.readAniListResponse).not.toHaveBeenCalled();
  });

  it('works without the desktop app', async () => {
    const { anilistQuery } = await freshClient();

    await expect(anilistQuery(QUERY, {}, { keepForMs: HOUR_MS })).resolves.toEqual(FRESH_DATA);
  });

  it('forgets nothing on disk but re-reads it after the session cache clears', async () => {
    window.shiori = fakeDesktop(savedHoursAgo(0.5));

    const { anilistQuery, forgetAniListResponses } = await freshClient();

    await anilistQuery(QUERY, {}, { keepForMs: HOUR_MS });
    await anilistQuery(QUERY, {}, { keepForMs: HOUR_MS });
    expect(window.shiori.readAniListResponse).toHaveBeenCalledTimes(1);

    forgetAniListResponses();
    await anilistQuery(QUERY, {}, { keepForMs: HOUR_MS });
    expect(window.shiori.readAniListResponse).toHaveBeenCalledTimes(2);
  });
});
