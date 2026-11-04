import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { app, BrowserWindow, ipcMain, powerMonitor, shell } from 'electron';
import { APP_ICON_FILE } from './appIcon.js';
import { showContextMenuOnRightClick } from './contextMenu.js';
import { registerBackupHandlers } from './ipc/backup.js';
import { registerAniListCacheHandlers } from './ipc/anilistCache.js';
import { registerCacheHandlers } from './ipc/caches.js';
import { registerCleanupHandlers } from './ipc/cleanup.js';
import { registerDownloadHandlers } from './ipc/downloads.js';
import { registerLibraryHandlers } from './ipc/library.js';
import { registerMediaHandlers, registerMediaScheme } from './ipc/media.js';
import { registerNetworkHandlers } from './ipc/network.js';
import { registerOfflineHandlers } from './ipc/offline.js';
import { applyGraphicsSettingAtLaunch, registerSettingsHandlers } from './ipc/settings.js';
import { registerTorrentHandlers } from './ipc/torrents.js';
import { registerUserDataHandlers } from './ipc/userData.js';
import { isLinux } from './linuxDesktop.js';
import { refreshLauncherEntry } from './linuxLauncherEntry.js';
import { logInfo, logUnhandledProcessErrors } from './logger.js';
import { keepWindowInTrayOnClose, opensInTray, showMainWindow, startTray } from './tray.js';
import { isWebUrl } from './webUrls.js';

const electronDirectory = path.dirname(fileURLToPath(import.meta.url));
const DEV_SERVER_URL = 'http://127.0.0.1:5173';
const DEFAULT_THEME_BACKGROUND = '#0b0d10';
const APP_PAGE_FILE = path.join(electronDirectory, '../dist/index.html');
const APP_PAGE_URL = pathToFileURL(APP_PAGE_FILE).href;
const isDevelopment = !app.isPackaged && process.argv.includes('--dev');

const withoutQueryAndHash = (url) => url.split(/[?#]/)[0];

const isAppUrl = (url) => (isDevelopment ? url.startsWith(DEV_SERVER_URL) : withoutQueryAndHash(url) === APP_PAGE_URL);

const openExternalLinksInBrowser = (webContents) => {
  webContents.setWindowOpenHandler(({ url }) => {
    if (isWebUrl(url)) shell.openExternal(url);

    return { action: 'deny' };
  });

  webContents.on('will-navigate', (event, url) => {
    if (isAppUrl(url)) return;

    event.preventDefault();

    if (isWebUrl(url)) shell.openExternal(url);
  });
};

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Shiori',
    backgroundColor: DEFAULT_THEME_BACKGROUND,
    autoHideMenuBar: true,
    show: false,
    paintWhenInitiallyHidden: !opensInTray(),
    ...(isLinux() && { icon: APP_ICON_FILE }),

    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(electronDirectory, 'preload.cjs'),
    },
  });

  if (!opensInTray()) mainWindow.once('ready-to-show', () => mainWindow.show());

  keepWindowInTrayOnClose(mainWindow);
  openExternalLinksInBrowser(mainWindow.webContents);
  showContextMenuOnRightClick(mainWindow.webContents);

  if (isDevelopment) mainWindow.loadURL(DEV_SERVER_URL);
  else mainWindow.loadFile(APP_PAGE_FILE);
};

const notifyWindowsOfSystemResume = () =>
  BrowserWindow.getAllWindows().forEach((window) => window.webContents.send('system:resume'));

const IPC_HANDLER_REGISTRATIONS = [
  registerSettingsHandlers,
  registerUserDataHandlers,
  registerOfflineHandlers,
  registerNetworkHandlers,
  registerDownloadHandlers,
  registerTorrentHandlers,
  registerLibraryHandlers,
  registerBackupHandlers,
  registerAniListCacheHandlers,
  registerCacheHandlers,
  registerCleanupHandlers,
  registerMediaHandlers,
];

const startApp = () => {
  registerMediaScheme();
  app.commandLine.appendSwitch('enable-blink-features', 'AudioVideoTracks');
  applyGraphicsSettingAtLaunch();
  app.on('second-instance', showMainWindow);

  app.whenReady().then(() => {
    logInfo(`Shiori ${app.getVersion()} started`);
    refreshLauncherEntry();
    IPC_HANDLER_REGISTRATIONS.forEach((registerHandlers) => registerHandlers());
    powerMonitor.on('resume', notifyWindowsOfSystemResume);
    ipcMain.handle('window:show', showMainWindow);
    startTray();
    createWindow();
  });
};

logUnhandledProcessErrors();

if (app.requestSingleInstanceLock()) startApp();
else app.quit();
