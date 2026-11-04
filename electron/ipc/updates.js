import { app, ipcMain } from 'electron';
import { UPDATE_PHASES } from '../../shared/updatePhases.js';
import { logError, logInfo } from '../logger.js';
import { sendToAllWindows } from '../windowMessages.js';
import { getSettings, onSettingsChanged, setPendingUpdateInstaller } from './settings.js';

const LAUNCH_CHECK_DELAY_MS = 5000;
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
const PHASES_THAT_BLOCK_A_CHECK = [UPDATE_PHASES.checking, UPDATE_PHASES.downloading, UPDATE_PHASES.ready];
const PHASES_THE_USER_IS_WAITING_ON = [UPDATE_PHASES.downloading, UPDATE_PHASES.ready];

let state = null;
let updaterLoad = null;
let isManualCheck = false;
let repeatCheckTimer = null;

const publishState = (changes) => {
  state = { ...state, ...changes };
  sendToAllWindows('updates:changed', state);
};

const phaseAfterQuietFailure = () => (state.availableVersion ? UPDATE_PHASES.available : UPDATE_PHASES.idle);

const publishFailure = () => {
  const userIsWaiting = isManualCheck || PHASES_THE_USER_IS_WAITING_ON.includes(state.phase);

  publishState({ phase: userIsWaiting ? UPDATE_PHASES.failed : phaseAfterQuietFailure() });
};

const handleUpdaterError = (error) => {
  logError('The update could not be completed', error);
  publishFailure();
};

const logUpdaterMessage = (message) => logInfo(`Updater: ${message}`);

const listenToUpdater = (updater) => {
  updater.on('checking-for-update', () => publishState({ phase: UPDATE_PHASES.checking }));
  updater.on('update-not-available', () => publishState({ phase: UPDATE_PHASES.upToDate, availableVersion: null }));

  updater.on('update-available', ({ version }) =>
    publishState({
      phase: updater.autoDownload ? UPDATE_PHASES.downloading : UPDATE_PHASES.available,
      availableVersion: version,
      downloadPercent: 0,
    }),
  );

  updater.on('download-progress', ({ percent }) =>
    publishState({ phase: UPDATE_PHASES.downloading, downloadPercent: Math.round(percent) }),
  );

  updater.on('update-downloaded', ({ version }) =>
    publishState({ phase: UPDATE_PHASES.ready, availableVersion: version }),
  );

  updater.on('error', handleUpdaterError);
};

const loadUpdater = async () => {
  const { autoUpdater } = (await import('electron-updater')).default;

  if (!autoUpdater.isUpdaterActive()) {
    publishState({ phase: UPDATE_PHASES.unsupported });

    return null;
  }

  autoUpdater.logger = { info: logUpdaterMessage, warn: logUpdaterMessage, error: logUpdaterMessage };
  listenToUpdater(autoUpdater);

  return autoUpdater;
};

const handleLoadFailure = (error) => {
  logError('The updater could not be loaded', error);
  updaterLoad = null;
  publishFailure();

  return null;
};

const activeUpdater = () => {
  updaterLoad ??= loadUpdater().catch(handleLoadFailure);

  return updaterLoad;
};

const checkForUpdate = async (isManual) => {
  if (state.phase === UPDATE_PHASES.unsupported || PHASES_THAT_BLOCK_A_CHECK.includes(state.phase)) return;

  isManualCheck = isManual;

  const updater = await activeUpdater();

  if (!updater) return;

  updater.autoDownload = getSettings().autoUpdate;

  const checkResult = await updater.checkForUpdates().catch(() => null);

  await checkResult?.downloadPromise?.catch(() => {});
};

const downloadUpdate = async () => {
  if (state.phase !== UPDATE_PHASES.available) return;

  const updater = await activeUpdater();

  publishState({ phase: UPDATE_PHASES.downloading, downloadPercent: 0 });
  await updater.downloadUpdate().catch(() => {});
};

const installUpdate = async () => {
  if (state.phase !== UPDATE_PHASES.ready) return;

  const updater = await activeUpdater();

  updater.quitAndInstall(true, true);
};

const installPendingUpdate = () => {
  if (state.phase !== UPDATE_PHASES.ready) return false;

  installUpdate();

  return true;
};

const stopRepeatChecks = () => {
  clearInterval(repeatCheckTimer);
  repeatCheckTimer = null;
};

const startRepeatChecks = () => {
  repeatCheckTimer = setInterval(() => checkForUpdate(false), CHECK_INTERVAL_MS);
};

const applyAutoDownloadToCheckInProgress = async (autoUpdate) => {
  const updater = await updaterLoad;

  if (updater) updater.autoDownload = autoUpdate;
};

const followAutoUpdateSetting = ({ autoUpdate }) => {
  const isRepeating = repeatCheckTimer !== null;

  applyAutoDownloadToCheckInProgress(autoUpdate);

  if (!autoUpdate && isRepeating) stopRepeatChecks();

  if (autoUpdate && !isRepeating) {
    startRepeatChecks();
    checkForUpdate(false);
  }
};

export const registerUpdateHandlers = () => {
  state = {
    phase: app.isPackaged ? UPDATE_PHASES.idle : UPDATE_PHASES.unsupported,
    currentVersion: app.getVersion(),
    availableVersion: null,
    downloadPercent: 0,
  };

  ipcMain.handle('updates:get-state', () => state);
  ipcMain.handle('updates:check', () => checkForUpdate(true));
  ipcMain.handle('updates:download', downloadUpdate);
  ipcMain.handle('updates:install', installUpdate);

  if (!app.isPackaged) return;

  setPendingUpdateInstaller(installPendingUpdate);
  setTimeout(() => checkForUpdate(false), LAUNCH_CHECK_DELAY_MS);

  if (getSettings().autoUpdate) startRepeatChecks();

  onSettingsChanged(followAutoUpdateSetting);
};
