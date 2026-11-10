import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { app, ipcMain, protocol, shell } from 'electron';
import { parseByteRange, UNSATISFIABLE_RANGE } from '../../shared/byteRange.js';
import { buildAss, buildCues } from '../../shared/subtitles.js';
import { isVideoFileName } from '../../shared/videoFiles.js';
import { folderUsage, writeFileAtomicallyAsync } from '../fileSystem.js';
import { logError } from '../logger.js';
import { readMkvSubtitleTracks } from '../mkvSubtitleReader.js';
import { videoResolutionsOf } from '../videoResolutions.js';
import { serveCover } from './offline.js';
import { resolveDownloadPath } from './paths.js';

const MEDIA_SCHEME = 'shiori-media';
const VIDEO_HOST = 'video';
const COVER_HOST = 'cover';

const VIDEO_CONTENT_TYPES = {
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.mkv': 'video/x-matroska',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
};

const FALLBACK_CONTENT_TYPE = 'application/octet-stream';
const SUBTITLE_CACHE_VERSION = 1;
const STYLED_SUBTITLE_TYPES = ['ass', 'ssa'];
const HTTP_OK = 200;
const HTTP_PARTIAL_CONTENT = 206;
const HTTP_NOT_FOUND = 404;
const HTTP_RANGE_NOT_SATISFIABLE = 416;
const SUBTITLE_CACHE_FILES_KEPT = 300;

const notFound = () => new Response('Not found', { status: HTTP_NOT_FOUND });

export const registerMediaScheme = () => {
  protocol.registerSchemesAsPrivileged([
    { scheme: MEDIA_SCHEME, privileges: { standard: true, secure: true, stream: true, supportFetchAPI: true } },
  ]);
};

const resolveRequestedVideo = async (url) => {
  try {
    const videoPath = resolveDownloadPath(decodeURIComponent(url.pathname.slice(1)));
    const { size } = await fs.promises.stat(videoPath);

    return { videoPath, size };
  } catch {
    return null;
  }
};

const videoResponseHeaders = (videoPath, range) => ({
  'Content-Type': VIDEO_CONTENT_TYPES[path.extname(videoPath).toLowerCase()] ?? FALLBACK_CONTENT_TYPE,
  'Content-Length': String(range.end - range.start + 1),
  'Accept-Ranges': 'bytes',
});

const serveMedia = async (request) => {
  const url = new URL(request.url);

  if (url.hostname === COVER_HOST) return serveCover(url);
  if (url.hostname !== VIDEO_HOST) return notFound();

  const video = await resolveRequestedVideo(url);

  if (!video) return notFound();

  const { videoPath, size } = video;
  const requestedRange = parseByteRange(request.headers.get('range'), size);

  if (requestedRange === UNSATISFIABLE_RANGE) {
    return new Response(null, { status: HTTP_RANGE_NOT_SATISFIABLE, headers: { 'Content-Range': `bytes */${size}` } });
  }

  const range = requestedRange ?? { start: 0, end: size - 1 };

  const headers = {
    ...videoResponseHeaders(videoPath, range),
    ...(requestedRange && { 'Content-Range': `bytes ${range.start}-${range.end}/${size}` }),
  };

  return new Response(Readable.toWeb(fs.createReadStream(videoPath, range)), {
    status: requestedRange ? HTTP_PARTIAL_CONTENT : HTTP_OK,
    headers,
  });
};

const toSubtitleTrack = (track) => {
  const isStyled = STYLED_SUBTITLE_TYPES.includes(track.type);

  return {
    number: track.number,
    language: track.language ?? null,
    name: track.name ?? null,
    kind: isStyled ? 'ass' : 'text',
    ...(isStyled ? { ass: buildAss(track.header ?? '', track.events) } : { cues: buildCues(track.events) }),
  };
};

const readMkvSubtitles = async (videoPath) => (await readMkvSubtitleTracks(videoPath)).map(toSubtitleTrack);

const subtitleCacheFolder = () => path.join(app.getPath('userData'), 'subtitle-cache');

const subtitleReadsInProgress = new Map();

const subtitleCacheKey = (videoPath, { size, mtimeMs }) =>
  createHash('sha1').update(`${SUBTITLE_CACHE_VERSION}|${videoPath}|${size}|${mtimeMs}`).digest('hex');

const readCachedSubtitles = (cacheFile) =>
  fs.promises
    .readFile(cacheFile, 'utf8')
    .then(JSON.parse)
    .catch(() => null);

const readAndCacheSubtitles = async (videoPath, cacheFile) => {
  const tracks = await readMkvSubtitles(videoPath);

  await writeFileAtomicallyAsync(cacheFile, JSON.stringify(tracks));

  return tracks;
};

const cacheFilesNewestFirst = async (cacheFolder) => {
  const fileNames = await fs.promises.readdir(cacheFolder).catch(() => []);

  const filesWithTimes = await Promise.all(
    fileNames.map(async (fileName) => {
      const filePath = path.join(cacheFolder, fileName);
      const { mtimeMs } = await fs.promises.stat(filePath);

      return { filePath, mtimeMs };
    }),
  );

  return filesWithTimes.sort((first, second) => second.mtimeMs - first.mtimeMs);
};

const pruneSubtitleCache = async () => {
  const cacheFiles = await cacheFilesNewestFirst(subtitleCacheFolder());

  await Promise.all(
    cacheFiles.slice(SUBTITLE_CACHE_FILES_KEPT).map(({ filePath }) => fs.promises.rm(filePath, { force: true })),
  );
};

export const subtitleCacheUsage = () => folderUsage(subtitleCacheFolder());

export const clearSubtitleCache = () => fs.promises.rm(subtitleCacheFolder(), { recursive: true, force: true });

const subtitlesFor = async (videoPath) => {
  if (path.extname(videoPath).toLowerCase() !== '.mkv') return [];

  const cacheKey = subtitleCacheKey(videoPath, await fs.promises.stat(videoPath));
  const cacheFile = path.join(subtitleCacheFolder(), `${cacheKey}.json`);
  const cachedTracks = await readCachedSubtitles(cacheFile);

  if (cachedTracks) return cachedTracks;

  if (!subtitleReadsInProgress.has(cacheKey)) {
    subtitleReadsInProgress.set(
      cacheKey,
      readAndCacheSubtitles(videoPath, cacheFile).finally(() => subtitleReadsInProgress.delete(cacheKey)),
    );
  }

  return subtitleReadsInProgress.get(cacheKey);
};

const openInDefaultPlayer = async (_event, relativePath) => {
  const videoPath = resolveDownloadPath(relativePath);

  if (!isVideoFileName(videoPath)) throw new Error('Only video files can be opened');

  const errorMessage = await shell.openPath(videoPath);

  if (errorMessage) throw new Error(errorMessage);
};

export const registerMediaHandlers = () => {
  protocol.handle(MEDIA_SCHEME, serveMedia);
  ipcMain.handle('media:subtitles', (_event, relativePath) => subtitlesFor(resolveDownloadPath(relativePath)));
  ipcMain.handle('media:resolutions', (_event, relativePaths) =>
    videoResolutionsOf(relativePaths, resolveDownloadPath),
  );
  ipcMain.handle('media:open-external', openInDefaultPlayer);
  pruneSubtitleCache().catch((error) => logError('Subtitle cache cleanup failed', error));
};
