import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const testFolder = vi.hoisted(() => ({ path: '' }));
const handlers = vi.hoisted(() => new Map());
const quitListeners = vi.hoisted(() => []);
const fetchMock = vi.hoisted(() => vi.fn());

vi.mock('electron', () => ({
  app: { getPath: () => testFolder.path, on: (_event, listener) => quitListeners.push(listener) },
  ipcMain: { handle: (channel, handler) => handlers.set(channel, handler) },
  net: { fetch: fetchMock },
}));

testFolder.path = fs.mkdtempSync(path.join(os.tmpdir(), 'shiori-offline-'));

const { clearOfflineLibrary, offlineLibraryUsage, registerOfflineHandlers, serveCover } =
  await import('../../electron/ipc/offline.js');

registerOfflineHandlers();

const invoke = (channel, ...args) => handlers.get(channel)({}, ...args);

const COVER_URL = 'https://s4.anilistcdn.anilist.co/cover/5.jpg';
const coverBytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);

const coverResponse = () => new Response(coverBytes, { headers: { 'Content-Type': 'image/jpeg' } });

const seriesEntry = (extra = {}) => ({
  series: { id: 5, malId: 50, title: 'Frieren', cover: COVER_URL },
  episodeOffset: 0,
  episodeTitles: { 1: 'The Journey’s End' },
  episodeTitlesUpTo: 12,
  savedAt: 1,
  ...extra,
});

const coverFolder = () => path.join(testFolder.path, 'offline', 'covers');

describe('offline library (main process)', () => {
  beforeEach(() => fetchMock.mockReset().mockImplementation(async () => coverResponse()));
  afterAll(() => fs.rmSync(testFolder.path, { recursive: true, force: true }));

  it('saves a series with its cover, serves the cover, and writes the file on quit', async () => {
    await invoke('offline:save-series', seriesEntry());

    const saved = await invoke('offline:load');

    expect(saved.series[5]).toMatchObject({ episodeTitles: { 1: 'The Journey’s End' }, episodeTitlesUpTo: 12 });
    expect(fs.readdirSync(coverFolder())).toEqual(['5.jpg']);

    const servedCover = await serveCover(new URL('shiori-media://cover/5'));

    expect(servedCover.headers.get('Content-Type')).toBe('image/jpeg');
    expect(Buffer.from(await servedCover.arrayBuffer())).toEqual(coverBytes);

    quitListeners.forEach((listener) => listener());

    const document = JSON.parse(fs.readFileSync(path.join(testFolder.path, 'offline', 'series.json'), 'utf8'));

    expect(document.data.series[5].series.title).toBe('Frieren');
  });

  it('does not download the same cover twice, and ignores covers from other hosts', async () => {
    await invoke('offline:save-series', seriesEntry());
    expect(fetchMock).not.toHaveBeenCalled();

    await invoke(
      'offline:save-series',
      seriesEntry({ series: { id: 6, title: 'X', cover: 'https://evil.example/x.jpg' } }),
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect((await serveCover(new URL('shiori-media://cover/6'))).status).toBe(404);
  });

  it('removes a series together with its cover and skip times', async () => {
    await invoke('offline:save-skip-times', '50:1', [{ interval: { startTime: 0, endTime: 90 }, skipType: 'op' }]);
    await invoke('offline:save-skip-times', '70:1', []);
    await invoke('offline:remove-series', [5]);

    const saved = await invoke('offline:load');

    expect(saved.series[5]).toBeUndefined();
    expect(Object.keys(saved.skipTimes)).toEqual(['70:1']);
    expect(fs.readdirSync(coverFolder())).toEqual([]);
  });

  it('clears everything saved, including covers and the .bak copy', async () => {
    await invoke('offline:save-series', seriesEntry());
    quitListeners.forEach((listener) => listener());
    await invoke('offline:save-series', seriesEntry({ savedAt: 2 }));
    quitListeners.forEach((listener) => listener());
    expect((await offlineLibraryUsage()).shows).toBeGreaterThan(0);

    await clearOfflineLibrary();

    expect(await invoke('offline:load')).toEqual({ series: {}, skipTimes: {} });
    expect((await offlineLibraryUsage()).shows).toBe(0);
    expect(fs.readdirSync(path.join(testFolder.path, 'offline'))).toEqual(['series.json']);
  });

  it('rejects malformed input', async () => {
    await expect(invoke('offline:save-series', { series: { id: 'x' } })).rejects.toThrow();
    expect(() => invoke('offline:save-skip-times', '../x', [])).toThrow();
  });
});
