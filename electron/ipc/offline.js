import fs from 'node:fs';
import path from 'node:path';
import { app, ipcMain, net } from 'electron';
import { folderUsage, writeFileAtomicallyAsync } from '../fileSystem.js';
import { logError } from '../logger.js';
import { backupPathFor, createUserDataFile } from '../userDataFile.js';

const SAVE_DELAY_MS = 2000;
const COVER_READ_TIMEOUT_MS = 20000;
const MAX_COVER_BYTES = 5 * 1024 * 1024;
const COVER_HOST = /(^|\.)anilist\.co$/;
const COVER_EXTENSIONS = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };

const COVER_CONTENT_TYPES = Object.fromEntries(
  Object.entries(COVER_EXTENSIONS).map(([contentType, extension]) => [extension, contentType]),
);

const SKIP_TIMES_KEY = /^\d+:\d+$/;
const HTTP_NOT_FOUND = 404;

const offlineFolder = () => path.join(app.getPath('userData'), 'offline');

const coverFolder = () => path.join(offlineFolder(), 'covers');

const offlineLibraryFile = () => path.join(offlineFolder(), 'series.json');

const notFound = () => new Response('Not found', { status: HTTP_NOT_FOUND });

const withAllSections = (data) => ({
  series: data.series ?? {},
  skipTimes: data.skipTimes ?? {},
  covers: data.covers ?? {},
});

let offlineFile = null;
let savedState = null;
let isWritable = true;

const isSeriesId = (value) => Number.isInteger(value) && value > 0;

const readSavedData = () => {
  try {
    return offlineFile.load().data;
  } catch (error) {
    logError('Offline library could not be opened; saving is off for this session', error);
    isWritable = false;

    return {};
  }
};

const state = () => {
  savedState ??= withAllSections(readSavedData());

  return savedState;
};

const persist = (...keys) => {
  if (isWritable) keys.forEach((key) => offlineFile.set(key, state()[key]));
};

const coverPath = (fileName) => path.join(coverFolder(), path.basename(fileName));

const isAllowedCoverUrl = (url) => {
  try {
    const target = new URL(url);

    return target.protocol === 'https:' && COVER_HOST.test(target.hostname);
  } catch {
    return false;
  }
};

const removeCoverFile = (fileName) =>
  fileName ? fs.promises.rm(coverPath(fileName), { force: true }) : Promise.resolve();

const hasSavedCover = (seriesId, coverUrl) => {
  const savedCover = state().covers[seriesId];

  return savedCover?.source === coverUrl && fs.existsSync(coverPath(savedCover.file));
};

const downloadCover = async (coverUrl) => {
  const response = await net.fetch(coverUrl, { signal: AbortSignal.timeout(COVER_READ_TIMEOUT_MS) });

  if (!response.ok) throw new Error(`Cover responded with ${response.status}`);

  const contentType = (response.headers.get('Content-Type') ?? '').split(';')[0].trim();
  const extension = COVER_EXTENSIONS[contentType];

  if (!extension) throw new Error(`Unexpected cover type ${contentType}`);

  const bytes = Buffer.from(await response.arrayBuffer());

  if (bytes.length > MAX_COVER_BYTES) throw new Error('Cover is too large');

  return { bytes, extension };
};

const saveCover = async (seriesId, coverUrl) => {
  if (!isAllowedCoverUrl(coverUrl) || hasSavedCover(seriesId, coverUrl)) return;

  const { bytes, extension } = await downloadCover(coverUrl);
  const fileName = `${seriesId}${extension}`;

  await writeFileAtomicallyAsync(coverPath(fileName), bytes);

  const previousFile = state().covers[seriesId]?.file;

  if (previousFile && previousFile !== fileName) await removeCoverFile(previousFile);

  state().covers[seriesId] = { source: coverUrl, file: fileName };
  persist('covers');
};

const loadOfflineLibrary = () => ({ series: state().series, skipTimes: state().skipTimes });

const saveSeries = async (_event, entry) => {
  const seriesId = entry?.series?.id;

  if (!isSeriesId(seriesId)) throw new Error('Not a series.');

  state().series[seriesId] = {
    series: entry.series,
    episodeOffset: Number(entry.episodeOffset) || 0,
    episodeTitles: entry.episodeTitles ?? {},
    episodeTitlesUpTo: Number(entry.episodeTitlesUpTo) || 0,
    savedAt: Number(entry.savedAt) || Date.now(),
    seriesFetchedAt: Number(entry.seriesFetchedAt) || Number(entry.savedAt) || Date.now(),
  };

  persist('series');

  await saveCover(seriesId, entry.series.cover).catch((error) =>
    logError(`Cover for series ${seriesId} could not be saved`, error),
  );
};

const skipTimesKeysOf = (malId) => Object.keys(state().skipTimes).filter((key) => key.startsWith(`${malId}:`));

const removeSavedSeries = async (seriesId) => {
  const malId = state().series[seriesId]?.series.malId;

  delete state().series[seriesId];

  if (malId) skipTimesKeysOf(malId).forEach((key) => delete state().skipTimes[key]);

  await removeCoverFile(state().covers[seriesId]?.file);
  delete state().covers[seriesId];
};

const removeSeries = async (_event, seriesIds) => {
  const idsToRemove = (Array.isArray(seriesIds) ? seriesIds : []).filter(isSeriesId);

  await Promise.all(idsToRemove.map(removeSavedSeries));
  persist('series', 'skipTimes', 'covers');
};

const saveSkipTimes = (_event, key, skipTimes) => {
  if (!SKIP_TIMES_KEY.test(String(key)) || !Array.isArray(skipTimes)) throw new Error('Not skip times.');

  state().skipTimes[key] = skipTimes;
  persist('skipTimes');
};

export const serveCover = async (url) => {
  const savedCover = state().covers[Number(url.pathname.slice(1))];

  if (!savedCover) return notFound();

  try {
    const bytes = await fs.promises.readFile(coverPath(savedCover.file));
    const contentType = COVER_CONTENT_TYPES[path.extname(savedCover.file)] ?? 'application/octet-stream';

    return new Response(bytes, { headers: { 'Content-Type': contentType } });
  } catch {
    return notFound();
  }
};

export const offlineLibraryUsage = async () => ({
  bytes: (await folderUsage(offlineFolder())).bytes,
  shows: Object.keys(state().series).length,
});

export const clearOfflineLibrary = async () => {
  savedState = withAllSections({});
  persist('series', 'skipTimes', 'covers');
  offlineFile.flush();

  await Promise.all([
    fs.promises.rm(coverFolder(), { recursive: true, force: true }),
    fs.promises.rm(backupPathFor(offlineLibraryFile()), { force: true }),
  ]);
};

const flushOfflineLibrary = () => offlineFile?.flush();

export const registerOfflineHandlers = () => {
  offlineFile = createUserDataFile({
    filePath: offlineLibraryFile(),
    saveDelayMs: SAVE_DELAY_MS,
    onSaveFailed: (error) => logError('Could not save the offline library', error),
  });

  ipcMain.handle('offline:load', loadOfflineLibrary);
  ipcMain.handle('offline:save-series', saveSeries);
  ipcMain.handle('offline:remove-series', removeSeries);
  ipcMain.handle('offline:save-skip-times', saveSkipTimes);
  app.on('before-quit', flushOfflineLibrary);
};
