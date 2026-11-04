import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const folders = vi.hoisted(() => ({ userData: '' }));
const handlers = vi.hoisted(() => new Map());

vi.mock('electron', () => ({
  app: { getPath: () => folders.userData, whenReady: () => new Promise(() => {}) },
  ipcMain: { handle: (channel, handler) => handlers.set(channel, handler) },
}));

vi.mock('../../electron/logger.js', () => ({ logError: () => {}, logInfo: () => {} }));

const { aniListCacheUsage, clearAniListCache, pruneAniListCache, registerAniListCacheHandlers } =
  await import('../../electron/ipc/anilistCache.js');

registerAniListCacheHandlers();

const DAY_MS = 24 * 60 * 60 * 1000;
const KEY = 'query { Media { id } }{"id":7}';
const DATA = { Media: { id: 7 } };

const read = (key) => handlers.get('anilist-cache:read')({}, key);

const save = (key, data) => handlers.get('anilist-cache:save')({}, key, data);

const cacheFolder = () => path.join(folders.userData, 'anilist-cache');

const cachedFiles = () => (fs.existsSync(cacheFolder()) ? fs.readdirSync(cacheFolder()) : []);

const setFileAge = (fileName, ageMs, now) => {
  const modifiedAt = new Date(now - ageMs);

  fs.utimesSync(path.join(cacheFolder(), fileName), modifiedAt, modifiedAt);
};

describe('saved AniList responses', () => {
  beforeEach(() => {
    folders.userData = fs.mkdtempSync(path.join(os.tmpdir(), 'shiori-anilist-cache-'));
  });

  afterEach(() => fs.rmSync(folders.userData, { recursive: true, force: true }));

  it('reads back what was saved, with the time it was saved', async () => {
    const before = Date.now();

    await save(KEY, DATA);

    const saved = await read(KEY);

    expect(saved.data).toEqual(DATA);
    expect(saved.savedAt).toBeGreaterThanOrEqual(before);
  });

  it('has nothing for a key it never saw', async () => {
    await expect(read('unknown')).resolves.toBeNull();
  });

  it('replaces an older answer for the same key', async () => {
    await save(KEY, { old: true });
    await save(KEY, DATA);

    expect((await read(KEY)).data).toEqual(DATA);
    expect(cachedFiles()).toHaveLength(1);
  });

  it('treats a damaged file as nothing saved', async () => {
    await save(KEY, DATA);
    fs.writeFileSync(path.join(cacheFolder(), cachedFiles()[0]), '{ not json');

    await expect(read(KEY)).resolves.toBeNull();
  });

  it('ignores a file written for a different key', async () => {
    await save(KEY, DATA);

    const filePath = path.join(cacheFolder(), cachedFiles()[0]);
    const saved = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    fs.writeFileSync(filePath, JSON.stringify({ ...saved, key: 'another key' }));

    await expect(read(KEY)).resolves.toBeNull();
  });

  it.each([
    ['an empty key', '', DATA],
    ['a key that is not text', 7, DATA],
    ['no data', KEY, null],
    ['data that is not an object', KEY, 'text'],
  ])('refuses to save %s', async (_name, key, data) => {
    expect(() => save(key, data)).toThrow('Not an AniList response');
    expect(cachedFiles()).toEqual([]);
  });

  it('keeps nothing readable outside its own folder when given a strange key', async () => {
    await save(`..${path.sep}..${path.sep}escape`, DATA);

    expect(cachedFiles()).toHaveLength(1);
    expect(fs.readdirSync(folders.userData)).toEqual(['anilist-cache']);
  });

  it('reports its size, and clears completely', async () => {
    await save(KEY, DATA);

    expect((await aniListCacheUsage()).files).toBe(1);
    await clearAniListCache();

    await expect(read(KEY)).resolves.toBeNull();
    expect((await aniListCacheUsage()).bytes).toBe(0);
  });

  describe('removing old files', () => {
    const NOW = Date.now();

    it('removes files older than two weeks and keeps newer ones', async () => {
      await save('old', DATA);

      const [oldFile] = cachedFiles();

      setFileAge(oldFile, 15 * DAY_MS, NOW);
      await save('new', DATA);
      await pruneAniListCache(NOW);

      await expect(read('old')).resolves.toBeNull();
      expect((await read('new')).data).toEqual(DATA);
    });

    it('keeps only the newest 600 files', async () => {
      fs.mkdirSync(cacheFolder());

      Array.from({ length: 605 }, (_, index) => `file-${index}.json`).forEach((fileName, index) => {
        fs.writeFileSync(path.join(cacheFolder(), fileName), '{}');
        setFileAge(fileName, index * 1000, NOW);
      });

      await pruneAniListCache(NOW);

      expect(cachedFiles()).toHaveLength(600);
      expect(cachedFiles()).toContain('file-0.json');
      expect(cachedFiles()).not.toContain('file-604.json');
    });

    it('does nothing before anything was saved', async () => {
      await expect(pruneAniListCache(NOW)).resolves.toBeUndefined();
    });
  });
});
