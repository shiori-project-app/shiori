const desktopBridge = () => {
  if (!window.shiori) throw new Error('This feature is only available in the Shiori desktop app.');

  return window.shiori;
};

export const hasDesktopBridge = () => Boolean(window.shiori);

const REMOTE_ERROR_PREFIX = /^Error invoking remote method '[^']+': (?:\w*Error: )?/;

const withoutRemotePrefix = (error) => {
  if (error instanceof Error) error.message = error.message.replace(REMOTE_ERROR_PREFIX, '');

  throw error;
};

const callDesktop =
  (methodName) =>
  (...args) =>
    new Promise((resolve) => resolve(desktopBridge()[methodName](...args))).catch(withoutRemotePrefix);

const callDesktopWithoutArguments = (methodName) => () => callDesktop(methodName)();

const subscribeToDesktop = (methodName) => (callback) =>
  window.shiori ? window.shiori[methodName](callback) : () => {};

export const fetchText = callDesktop('fetchText');

export const getSettings = callDesktopWithoutArguments('getSettings');
export const chooseDownloadDir = callDesktopWithoutArguments('chooseDownloadDir');
export const openDownloadDir = callDesktopWithoutArguments('openDownloadDir');
export const updateDownloadSettings = callDesktop('updateDownloadSettings');
export const updateGraphicsSetting = callDesktop('updateGraphicsSetting');
export const updateBackgroundSettings = callDesktop('updateBackgroundSettings');
export const updateAutoUpdateSetting = callDesktop('updateAutoUpdateSetting');
export const showMainWindow = callDesktopWithoutArguments('showMainWindow');
export const restartApp = callDesktopWithoutArguments('restartApp');

export const loadUserData = callDesktopWithoutArguments('loadUserData');
export const saveUserData = callDesktop('saveUserData');
export const replaceUserData = callDesktop('replaceUserData');

export const loadOfflineLibrary = callDesktopWithoutArguments('loadOfflineLibrary');
export const saveOfflineSeries = callDesktop('saveOfflineSeries');
export const removeOfflineSeries = callDesktop('removeOfflineSeries');
export const saveOfflineSkipTimes = callDesktop('saveOfflineSkipTimes');

export const getTorrentApp = callDesktopWithoutArguments('torrentApp');
export const openMagnet = callDesktop('openMagnet');

export const scanLibrary = callDesktopWithoutArguments('scanLibrary');
export const showLibraryFile = callDesktop('showLibraryFile');

export const getSubtitles = callDesktop('getSubtitles');
export const openExternally = callDesktop('openExternally');

export const saveExport = callDesktop('saveExport');
export const openBackup = callDesktopWithoutArguments('openBackup');
export const autoBackup = callDesktop('autoBackup');

export const readAniListResponse = callDesktop('readAniListResponse');
export const saveAniListResponse = callDesktop('saveAniListResponse');

export const getCacheUsage = callDesktopWithoutArguments('getCacheUsage');
export const clearSubtitleCache = callDesktopWithoutArguments('clearSubtitleCache');
export const clearAniListData = callDesktopWithoutArguments('clearAniListData');

export const getDownloadFolderUsage = callDesktopWithoutArguments('getDownloadFolderUsage');
export const getFileSizes = callDesktop('getFileSizes');
export const chooseCleanupMoveFolder = callDesktopWithoutArguments('chooseCleanupMoveFolder');
export const cleanUpFile = callDesktop('cleanUpFile');

export const listDownloads = callDesktopWithoutArguments('listDownloads');
export const addDownloads = callDesktop('addDownloads');
export const pauseDownload = callDesktop('pauseDownload');
export const resumeDownload = callDesktop('resumeDownload');
export const pauseAllDownloads = callDesktopWithoutArguments('pauseAllDownloads');
export const resumeAllDownloads = callDesktopWithoutArguments('resumeAllDownloads');
export const cancelDownload = callDesktop('cancelDownload');
export const retryDownload = callDesktop('retryDownload');
export const moveDownload = callDesktop('moveDownload');
export const removeDownload = callDesktop('removeDownload');
export const clearFinishedDownloads = callDesktopWithoutArguments('clearFinishedDownloads');
export const showDownload = callDesktop('showDownload');

export const getUpdateState = callDesktopWithoutArguments('getUpdateState');
export const checkForUpdates = callDesktopWithoutArguments('checkForUpdates');
export const downloadUpdate = callDesktopWithoutArguments('downloadUpdate');
export const installUpdate = callDesktopWithoutArguments('installUpdate');

export const onSystemResume = subscribeToDesktop('onSystemResume');
export const onHiddenToTray = subscribeToDesktop('onHiddenToTray');
export const onDownloadsChanged = subscribeToDesktop('onDownloadsChanged');
export const onUserDataSaveFailed = subscribeToDesktop('onUserDataSaveFailed');
export const onUpdateStateChanged = subscribeToDesktop('onUpdateStateChanged');
