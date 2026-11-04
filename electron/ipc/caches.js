import { ipcMain, session } from 'electron';
import { aniListCacheUsage, clearAniListCache } from './anilistCache.js';
import { clearSubtitleCache, subtitleCacheUsage } from './media.js';
import { clearOfflineLibrary, offlineLibraryUsage } from './offline.js';

const cacheUsage = async () => {
  const [subtitles, offlineLibrary, savedResponses, imageCacheBytes] = await Promise.all([
    subtitleCacheUsage(),
    offlineLibraryUsage(),
    aniListCacheUsage(),
    session.defaultSession.getCacheSize(),
  ]);

  return {
    subtitles,
    anilist: { bytes: offlineLibrary.bytes + savedResponses.bytes + imageCacheBytes, shows: offlineLibrary.shows },
  };
};

const clearAniListData = () =>
  Promise.all([clearOfflineLibrary(), clearAniListCache(), session.defaultSession.clearCache()]);

export const registerCacheHandlers = () => {
  ipcMain.handle('caches:usage', cacheUsage);
  ipcMain.handle('caches:clear-subtitles', () => clearSubtitleCache());
  ipcMain.handle('caches:clear-anilist', () => clearAniListData());
};
