import { app, BrowserWindow, Menu, nativeImage, Tray } from 'electron';
import { APP_ICON_FILE } from './appIcon.js';
import { getSettings, onSettingsChanged } from './ipc/settings.js';
import { desktopHasTray } from './linuxDesktop.js';
import { logError } from './logger.js';
import { START_IN_TRAY_ARGUMENT } from './loginItem.js';

const TRAY_ICON_SIZE = 32;
const TRAY_TOOLTIP = 'Shiori';

let tray = null;
let isQuitting = false;

export const showMainWindow = () => {
  const [mainWindow] = BrowserWindow.getAllWindows();

  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();

  mainWindow.show();
  mainWindow.focus();
};

const createTray = () => {
  const icon = nativeImage.createFromPath(APP_ICON_FILE);

  if (icon.isEmpty()) throw new Error(`Tray icon not found: ${APP_ICON_FILE}`);

  const newTray = new Tray(icon.resize({ width: TRAY_ICON_SIZE, height: TRAY_ICON_SIZE }));

  newTray.setToolTip(TRAY_TOOLTIP);

  newTray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Open Shiori', click: showMainWindow },
      { type: 'separator' },
      { label: 'Quit Shiori', click: () => app.quit() },
    ]),
  );

  newTray.on('click', showMainWindow);

  return newTray;
};

const removeTray = () => {
  tray?.destroy();
  tray = null;
};

const addTray = () => {
  try {
    tray = createTray();
  } catch (error) {
    logError('The tray icon could not be created', error);
  }
};

const syncTrayWithSettings = ({ keepRunningInTray }) => {
  if (keepRunningInTray && !tray && desktopHasTray()) addTray();
  if (!keepRunningInTray) removeTray();
};

const quitForEndOfSession = () => {
  isQuitting = true;
  app.quit();
};

export const opensInTray = () => process.argv.includes(START_IN_TRAY_ARGUMENT) && tray !== null;

export const keepWindowInTrayOnClose = (mainWindow) => {
  mainWindow.on('close', (event) => {
    if (isQuitting || !tray) return;

    event.preventDefault();
    mainWindow.hide();
    mainWindow.webContents.send('window:hidden-to-tray');
  });

  mainWindow.on('session-end', quitForEndOfSession);
};

export const startTray = () => {
  app.on('before-quit', () => {
    isQuitting = true;
  });

  onSettingsChanged(syncTrayWithSettings);
  syncTrayWithSettings(getSettings());
};
