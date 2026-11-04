import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { app, ipcMain } from 'electron';
import { folderUsage, writeFileAtomicallyAsync } from '../fileSystem.js';
import { logError } from '../logger.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_AGE_MS = 14 * DAY_MS;
const MAX_FILES = 600;
const MAX_TOTAL_BYTES = 100 * 1024 * 1024;

const cacheFolder = () => path.join(app.getPath('userData'), 'anilist-cache');

const responseFile = (key) => path.join(cacheFolder(), `${crypto.createHash('sha256').update(key).digest('hex')}.json`);

const isUsableKey = (key) => typeof key === 'string' && key.length > 0;

const readResponse = async (_event, key) => {
  if (!isUsableKey(key)) return null;

  try {
    const saved = JSON.parse(await fs.promises.readFile(responseFile(key), 'utf8'));

    return saved.key === key && Number.isFinite(saved.savedAt) ? { data: saved.data, savedAt: saved.savedAt } : null;
  } catch {
    return null;
  }
};

const saveResponse = (_event, key, data) => {
  if (!isUsableKey(key) || typeof data !== 'object' || data === null) throw new Error('Not an AniList response.');

  return writeFileAtomicallyAsync(responseFile(key), JSON.stringify({ key, savedAt: Date.now(), data }));
};

const statOfFile = async (fileName) => {
  const filePath = path.join(cacheFolder(), fileName);
  const stats = await fs.promises.stat(filePath).catch(() => null);

  return stats && { filePath, bytes: stats.size, modifiedAt: stats.mtimeMs };
};

const filesToRemove = (files, now) => {
  const newestFirst = [...files].sort((first, second) => second.modifiedAt - first.modifiedAt);

  const { removed } = newestFirst.reduce(
    (progress, file, index) => {
      const bytesWithFile = progress.keptBytes + file.bytes;
      const isKept = now - file.modifiedAt < MAX_AGE_MS && index < MAX_FILES && bytesWithFile <= MAX_TOTAL_BYTES;

      return isKept
        ? { ...progress, keptBytes: bytesWithFile }
        : { ...progress, removed: [...progress.removed, file.filePath] };
    },
    { keptBytes: 0, removed: [] },
  );

  return removed;
};

export const pruneAniListCache = async (now = Date.now()) => {
  const fileNames = await fs.promises.readdir(cacheFolder()).catch(() => []);
  const files = (await Promise.all(fileNames.map(statOfFile))).filter(Boolean);

  await Promise.all(filesToRemove(files, now).map((filePath) => fs.promises.rm(filePath, { force: true })));
};

export const aniListCacheUsage = () => folderUsage(cacheFolder());

export const clearAniListCache = () => fs.promises.rm(cacheFolder(), { recursive: true, force: true });

export const registerAniListCacheHandlers = () => {
  ipcMain.handle('anilist-cache:read', readResponse);
  ipcMain.handle('anilist-cache:save', saveResponse);

  app
    .whenReady()
    .then(() => pruneAniListCache().catch((error) => logError('Old AniList responses could not be removed', error)));
};
