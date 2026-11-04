import { createContext, useEffect, useMemo, useState } from 'react';
import {
  chooseCleanupMoveFolder,
  chooseDownloadDir,
  getSettings,
  openDownloadDir,
  restartApp,
  updateAutoUpdateSetting,
  updateBackgroundSettings,
  updateDownloadSettings,
  updateGraphicsSetting,
} from '@/api/clients/desktopClient';
import { DEFAULT_PARALLEL_DOWNLOADS } from '@shared/downloadLimits';

const INITIAL_SETTINGS = {
  downloadDir: '',
  maxParallelDownloads: DEFAULT_PARALLEL_DOWNLOADS,
  speedLimitKBps: 0,
  smoothGraphics: false,
  smoothGraphicsAtLaunch: false,
  cleanupMoveFolder: null,
  keepRunningInTray: false,
  autoUpdate: false,
  platform: null,
  canKeepRunningInTray: true,
  startAtLogin: false,
  canStartAtLogin: false,
};

export const SettingsContext = createContext(null);

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(INITIAL_SETTINGS);

  useEffect(() => {
    if (window.shiori) getSettings().then(setSettings);
  }, []);

  const value = useMemo(
    () => ({
      ...settings,
      chooseDownloadDir: async () => setSettings(await chooseDownloadDir()),
      chooseCleanupMoveFolder: async () => setSettings(await chooseCleanupMoveFolder()),
      openDownloadDir,
      updateDownloads: async (changes) => setSettings(await updateDownloadSettings(changes)),
      updateGraphics: async (changes) => setSettings(await updateGraphicsSetting(changes)),
      updateBackground: async (changes) => setSettings(await updateBackgroundSettings(changes)),
      updateAutoUpdate: async (changes) => setSettings(await updateAutoUpdateSetting(changes)),
      restartApp,
    }),
    [settings],
  );

  return <SettingsContext value={value}>{children}</SettingsContext>;
};
