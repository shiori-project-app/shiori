import fs from 'node:fs';
import path from 'node:path';
import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import { DEFAULT_PARALLEL_DOWNLOADS, UNLIMITED_SPEED, validDownloadSettings } from '../../shared/downloadLimits.js';
import { writeFileAtomically } from '../fileSystem.js';
import { desktopHasTray, isLinux, startAgainAfterExit } from '../linuxDesktop.js';
import { logError } from '../logger.js';
import {
  canOpenAtLogin,
  opensAtLogin,
  refreshLoginItem,
  setOpensAtLogin,
  START_IN_TRAY_ARGUMENT,
} from '../loginItem.js';

const SOFTWARE_DRAWING_SWITCH = 'disable-gpu-compositing';
const RESTART_FAILED_TITLE = 'Shiori could not restart';
const RESTART_FAILED_MESSAGE = 'Close Shiori and open it again to apply this change.';

const settingsFile = () => path.join(app.getPath('userData'), 'settings.json');

const appDownloadFolder = () =>
  isLinux() ? path.join(app.getPath('videos'), 'Shiori') : path.join(app.getPath('userData'), 'Downloads');

export const isAppDownloadFolder = (folder) => path.resolve(folder) === path.resolve(appDownloadFolder());

const previousDefaultDownloadFolder = () => path.join(app.getPath('downloads'), 'Shiori');

const defaultSettings = () => ({
  downloadDir: appDownloadFolder(),
  maxParallelDownloads: DEFAULT_PARALLEL_DOWNLOADS,
  speedLimitKBps: UNLIMITED_SPEED,
  smoothGraphics: false,
  cleanupMoveFolder: null,
  keepRunningInTray: false,
  autoUpdate: false,
});

let currentSettings = null;
let smoothGraphicsAtLaunch = false;
const changeListeners = new Set();

export const onSettingsChanged = (listener) => changeListeners.add(listener);

const readSettingsFile = () => {
  if (!fs.existsSync(settingsFile())) return {};

  try {
    return JSON.parse(fs.readFileSync(settingsFile(), 'utf8'));
  } catch (error) {
    logError('Settings file could not be read; using defaults', error);

    return {};
  }
};

const keepsPreviousDownloadFolder = (savedSettings) =>
  !savedSettings.downloadDir && fs.existsSync(previousDefaultDownloadFolder());

const readSavedSettings = () => {
  const savedSettings = readSettingsFile();

  if (!keepsPreviousDownloadFolder(savedSettings)) return { ...defaultSettings(), ...savedSettings };

  const settingsWithPreviousFolder = {
    ...defaultSettings(),
    ...savedSettings,
    downloadDir: previousDefaultDownloadFolder(),
  };

  writeFileAtomically(settingsFile(), JSON.stringify(settingsWithPreviousFolder, null, 2));

  return settingsWithPreviousFolder;
};

export const getSettings = () => {
  currentSettings ??= readSavedSettings();

  return currentSettings;
};

const saveSettings = (changes) => {
  currentSettings = { ...getSettings(), ...changes };
  writeFileAtomically(settingsFile(), JSON.stringify(currentSettings, null, 2));
  changeListeners.forEach((listener) => listener(currentSettings));

  return currentSettings;
};

export const applyGraphicsSettingAtLaunch = () => {
  smoothGraphicsAtLaunch = getSettings().smoothGraphics === true;

  if (smoothGraphicsAtLaunch) app.commandLine.appendSwitch(SOFTWARE_DRAWING_SWITCH);
};

export const settingsForPage = (settings) => ({
  ...settings,
  smoothGraphicsAtLaunch,
  platform: process.platform,
  canKeepRunningInTray: desktopHasTray(),
  startAtLogin: opensAtLogin(),
  canStartAtLogin: canOpenAtLogin(),
});

export const saveCleanupMoveFolder = (folder) => settingsForPage(saveSettings({ cleanupMoveFolder: folder }));

export const updateGraphicsSetting = (changes) =>
  settingsForPage(saveSettings({ smoothGraphics: changes?.smoothGraphics === true }));

const updateAutoUpdateSetting = (changes) =>
  settingsForPage(saveSettings({ autoUpdate: changes?.autoUpdate === true }));

const updateBackgroundSettings = (changes) => {
  if (typeof changes?.startAtLogin === 'boolean') setOpensAtLogin(changes.startAtLogin);

  const settings =
    typeof changes?.keepRunningInTray === 'boolean'
      ? saveSettings({ keepRunningInTray: changes.keepRunningInTray })
      : getSettings();

  return settingsForPage(settings);
};

let installPendingUpdate = () => false;

export const setPendingUpdateInstaller = (installer) => {
  installPendingUpdate = installer;
};

const restartArguments = () => process.argv.slice(1).filter((argument) => argument !== START_IN_TRAY_ARGUMENT);

const restartOnLinux = async () => {
  try {
    await startAgainAfterExit(restartArguments());
    app.quit();
  } catch (error) {
    logError('The restart could not be prepared', error);
    dialog.showErrorBox(RESTART_FAILED_TITLE, RESTART_FAILED_MESSAGE);
  }
};

const restartOnWindows = () => {
  app.relaunch({ args: restartArguments() });
  app.quit();
};

const restartApp = () => {
  if (installPendingUpdate()) return undefined;

  return isLinux() ? restartOnLinux() : restartOnWindows();
};

const chooseDownloadFolder = async (event) => {
  const { canceled, filePaths } = await dialog.showOpenDialog(BrowserWindow.fromWebContents(event.sender), {
    title: 'Choose where Shiori saves anime',
    defaultPath: getSettings().downloadDir,
    properties: ['openDirectory', 'createDirectory'],
  });

  return canceled ? getSettings() : saveSettings({ downloadDir: filePaths[0] });
};

const openDownloadFolder = async () => {
  const downloadFolder = getSettings().downloadDir;

  fs.mkdirSync(downloadFolder, { recursive: true });

  const errorMessage = await shell.openPath(downloadFolder);

  if (errorMessage) throw new Error(errorMessage);
};

export const registerSettingsHandlers = () => {
  refreshLoginItem();
  ipcMain.handle('settings:get', () => settingsForPage(getSettings()));
  ipcMain.handle('settings:choose-download-dir', async (event) => settingsForPage(await chooseDownloadFolder(event)));

  ipcMain.handle('settings:update-downloads', (_event, changes) =>
    settingsForPage(saveSettings(validDownloadSettings(changes))),
  );

  ipcMain.handle('settings:update-graphics', (_event, changes) => updateGraphicsSetting(changes));
  ipcMain.handle('settings:update-background', (_event, changes) => updateBackgroundSettings(changes));
  ipcMain.handle('settings:update-auto-update', (_event, changes) => updateAutoUpdateSetting(changes));
  ipcMain.handle('settings:restart', restartApp);
  ipcMain.handle('settings:open-download-dir', openDownloadFolder);
};
