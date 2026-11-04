const { contextBridge, ipcRenderer } = require('electron');

const invokeChannel =
  (channel) =>
  (...args) =>
    ipcRenderer.invoke(channel, ...args);

const subscribeToChannel = (channel) => (callback) => {
  const listener = (_event, ...payload) => callback(...payload);

  ipcRenderer.on(channel, listener);

  return () => ipcRenderer.removeListener(channel, listener);
};

contextBridge.exposeInMainWorld('shiori', {
  fetchText: (url, cookie) => ipcRenderer.invoke('net:fetch-text', { url, cookie }),

  getSettings: invokeChannel('settings:get'),
  chooseDownloadDir: invokeChannel('settings:choose-download-dir'),
  openDownloadDir: invokeChannel('settings:open-download-dir'),
  updateDownloadSettings: invokeChannel('settings:update-downloads'),
  updateGraphicsSetting: invokeChannel('settings:update-graphics'),
  updateBackgroundSettings: invokeChannel('settings:update-background'),
  updateAutoUpdateSetting: invokeChannel('settings:update-auto-update'),
  showMainWindow: invokeChannel('window:show'),
  restartApp: invokeChannel('settings:restart'),

  loadUserData: invokeChannel('user-data:load'),
  saveUserData: invokeChannel('user-data:set'),
  replaceUserData: invokeChannel('user-data:replace'),

  loadOfflineLibrary: invokeChannel('offline:load'),
  saveOfflineSeries: invokeChannel('offline:save-series'),
  removeOfflineSeries: invokeChannel('offline:remove-series'),
  saveOfflineSkipTimes: invokeChannel('offline:save-skip-times'),

  torrentApp: invokeChannel('torrent:app'),
  openMagnet: (magnet, folder) => ipcRenderer.invoke('torrent:open', { magnet, folder }),

  scanLibrary: invokeChannel('library:scan'),
  showLibraryFile: invokeChannel('library:show'),

  getSubtitles: invokeChannel('media:subtitles'),
  openExternally: invokeChannel('media:open-external'),

  saveExport: invokeChannel('backup:save'),
  openBackup: invokeChannel('backup:open'),
  autoBackup: invokeChannel('backup:auto'),

  readAniListResponse: invokeChannel('anilist-cache:read'),
  saveAniListResponse: invokeChannel('anilist-cache:save'),

  getCacheUsage: invokeChannel('caches:usage'),
  clearSubtitleCache: invokeChannel('caches:clear-subtitles'),
  clearAniListData: invokeChannel('caches:clear-anilist'),

  getDownloadFolderUsage: invokeChannel('cleanup:usage'),
  getFileSizes: invokeChannel('cleanup:file-sizes'),
  chooseCleanupMoveFolder: invokeChannel('cleanup:choose-move-folder'),
  cleanUpFile: invokeChannel('cleanup:clean-file'),

  listDownloads: invokeChannel('downloads:list'),
  addDownloads: invokeChannel('downloads:add'),
  pauseDownload: invokeChannel('downloads:pause'),
  resumeDownload: invokeChannel('downloads:resume'),
  pauseAllDownloads: invokeChannel('downloads:pause-all'),
  resumeAllDownloads: invokeChannel('downloads:resume-all'),
  cancelDownload: invokeChannel('downloads:cancel'),
  retryDownload: invokeChannel('downloads:retry'),
  moveDownload: invokeChannel('downloads:move'),
  removeDownload: invokeChannel('downloads:remove'),
  clearFinishedDownloads: invokeChannel('downloads:clear-finished'),
  showDownload: invokeChannel('downloads:show'),

  getUpdateState: invokeChannel('updates:get-state'),
  checkForUpdates: invokeChannel('updates:check'),
  downloadUpdate: invokeChannel('updates:download'),
  installUpdate: invokeChannel('updates:install'),

  onSystemResume: subscribeToChannel('system:resume'),
  onHiddenToTray: subscribeToChannel('window:hidden-to-tray'),
  onDownloadsChanged: subscribeToChannel('downloads:changed'),
  onUserDataSaveFailed: subscribeToChannel('user-data:save-failed'),
  onUpdateStateChanged: subscribeToChannel('updates:changed'),
});
