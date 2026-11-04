import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UPDATE_PHASES } from '@shared/updatePhases';

const fakes = vi.hoisted(() => ({
  handlers: new Map(),
  isPackaged: true,
  settings: { autoUpdate: true },
  settingsListeners: [],
  send: vi.fn(),
  logError: vi.fn(),
  logInfo: vi.fn(),
  pendingUpdateInstaller: null,
  autoUpdater: null,
}));

vi.mock('electron', () => ({
  app: {
    getVersion: () => '1.0.0',

    get isPackaged() {
      return fakes.isPackaged;
    },
  },

  BrowserWindow: { getAllWindows: () => [{ webContents: { send: fakes.send } }] },
  ipcMain: { handle: (channel, handler) => fakes.handlers.set(channel, handler) },
}));

vi.mock('electron-updater', () => ({
  default: {
    get autoUpdater() {
      return fakes.autoUpdater;
    },
  },
}));

vi.mock('../../electron/ipc/settings.js', () => ({
  getSettings: () => fakes.settings,
  onSettingsChanged: (listener) => fakes.settingsListeners.push(listener),

  setPendingUpdateInstaller: (installer) => {
    fakes.pendingUpdateInstaller = installer;
  },
}));

vi.mock('../../electron/logger.js', () => ({ logError: fakes.logError, logInfo: fakes.logInfo }));

const LAUNCH_CHECK_DELAY_MS = 5000;
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

const createFakeUpdater = () =>
  Object.assign(new EventEmitter(), {
    autoDownload: false,
    isUpdaterActive: vi.fn(() => true),
    checkForUpdates: vi.fn(async () => null),
    downloadUpdate: vi.fn(async () => []),
    quitAndInstall: vi.fn(),
  });

const invoke = (channel) => fakes.handlers.get(channel)();

const currentPhase = () => invoke('updates:get-state').phase;

const start = async () => {
  vi.resetModules();

  const { registerUpdateHandlers } = await import('../../electron/ipc/updates.js');

  registerUpdateHandlers();
};

const changeAutoUpdate = (autoUpdate) => {
  fakes.settings = { autoUpdate };
  fakes.settingsListeners.forEach((listener) => listener(fakes.settings));
};

describe('app updates', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    fakes.handlers.clear();
    fakes.isPackaged = true;
    fakes.settings = { autoUpdate: true };
    fakes.settingsListeners = [];
    fakes.send.mockReset();
    fakes.logError.mockReset();
    fakes.logInfo.mockReset();
    fakes.pendingUpdateInstaller = null;
    fakes.autoUpdater = createFakeUpdater();
  });

  afterEach(() => vi.useRealTimers());

  describe('outside the installed app', () => {
    beforeEach(() => {
      fakes.isPackaged = false;
    });

    it('never schedules a check or loads the updater', async () => {
      await start();
      await vi.advanceTimersByTimeAsync(CHECK_INTERVAL_MS);

      expect(currentPhase()).toBe(UPDATE_PHASES.unsupported);
      expect(fakes.autoUpdater.checkForUpdates).not.toHaveBeenCalled();
    });

    it('ignores a manual check', async () => {
      await start();
      await invoke('updates:check');

      expect(fakes.autoUpdater.checkForUpdates).not.toHaveBeenCalled();
    });
  });

  it('reports itself as unsupported in a package that cannot update, such as the Linux tar.gz', async () => {
    fakes.autoUpdater.isUpdaterActive.mockReturnValue(false);

    await start();
    await invoke('updates:check');

    expect(currentPhase()).toBe(UPDATE_PHASES.unsupported);
    expect(fakes.autoUpdater.checkForUpdates).not.toHaveBeenCalled();
  });

  describe('scheduled checks', () => {
    it('run soon after every launch, then repeat every 6 hours', async () => {
      await start();
      expect(fakes.autoUpdater.checkForUpdates).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(LAUNCH_CHECK_DELAY_MS);
      expect(fakes.autoUpdater.checkForUpdates).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(CHECK_INTERVAL_MS);
      expect(fakes.autoUpdater.checkForUpdates).toHaveBeenCalledTimes(2);
    });

    it('still run at launch with the setting off, without downloading or repeating', async () => {
      fakes.settings = { autoUpdate: false };

      await start();
      await vi.advanceTimersByTimeAsync(LAUNCH_CHECK_DELAY_MS);
      expect(fakes.autoUpdater.checkForUpdates).toHaveBeenCalledTimes(1);
      expect(fakes.autoUpdater.autoDownload).toBe(false);

      await vi.advanceTimersByTimeAsync(CHECK_INTERVAL_MS * 2);
      expect(fakes.autoUpdater.checkForUpdates).toHaveBeenCalledTimes(1);
    });

    it('stop repeating when the setting is turned off', async () => {
      await start();
      await vi.advanceTimersByTimeAsync(LAUNCH_CHECK_DELAY_MS);
      changeAutoUpdate(false);
      await vi.advanceTimersByTimeAsync(CHECK_INTERVAL_MS);

      expect(fakes.autoUpdater.checkForUpdates).toHaveBeenCalledTimes(1);
    });

    it('run right away when the setting is turned on, then repeat', async () => {
      fakes.settings = { autoUpdate: false };

      await start();
      await vi.advanceTimersByTimeAsync(LAUNCH_CHECK_DELAY_MS);

      changeAutoUpdate(true);
      await vi.advanceTimersByTimeAsync(0);
      expect(fakes.autoUpdater.checkForUpdates).toHaveBeenCalledTimes(2);
      expect(fakes.autoUpdater.autoDownload).toBe(true);

      await vi.advanceTimersByTimeAsync(CHECK_INTERVAL_MS);
      expect(fakes.autoUpdater.checkForUpdates).toHaveBeenCalledTimes(3);
    });

    it('are not doubled by other settings changing', async () => {
      await start();
      changeAutoUpdate(true);
      changeAutoUpdate(true);
      await vi.advanceTimersByTimeAsync(LAUNCH_CHECK_DELAY_MS);

      expect(fakes.autoUpdater.checkForUpdates).toHaveBeenCalledTimes(1);
    });
  });

  describe('downloading', () => {
    it('starts by itself with the setting on', async () => {
      await start();
      await invoke('updates:check');

      expect(fakes.autoUpdater.autoDownload).toBe(true);

      fakes.autoUpdater.emit('update-available', { version: '1.1.0' });
      expect(invoke('updates:get-state')).toMatchObject({
        phase: UPDATE_PHASES.downloading,
        availableVersion: '1.1.0',
      });
    });

    it('waits to be asked with the setting off', async () => {
      fakes.settings = { autoUpdate: false };

      await start();
      await invoke('updates:check');

      expect(fakes.autoUpdater.autoDownload).toBe(false);

      fakes.autoUpdater.emit('update-available', { version: '1.1.0' });
      expect(currentPhase()).toBe(UPDATE_PHASES.available);
      expect(fakes.autoUpdater.downloadUpdate).not.toHaveBeenCalled();

      await invoke('updates:download');
      expect(fakes.autoUpdater.downloadUpdate).toHaveBeenCalledTimes(1);
      expect(currentPhase()).toBe(UPDATE_PHASES.downloading);
    });

    it('reports whole percentages to the page', async () => {
      await start();
      await invoke('updates:check');
      fakes.autoUpdater.emit('download-progress', { percent: 41.6 });

      expect(invoke('updates:get-state').downloadPercent).toBe(42);
      expect(fakes.send).toHaveBeenLastCalledWith('updates:changed', expect.objectContaining({ downloadPercent: 42 }));
    });

    it('does not start without an available update', async () => {
      await start();
      await invoke('updates:download');

      expect(fakes.autoUpdater.downloadUpdate).not.toHaveBeenCalled();
    });

    it('does not leave an unhandled rejection when an automatic download fails', async () => {
      fakes.autoUpdater.checkForUpdates.mockResolvedValue({ downloadPromise: Promise.reject(new Error('Cut off')) });

      await start();

      await expect(invoke('updates:check')).resolves.toBeUndefined();
    });
  });

  describe('failures', () => {
    const failWith = (message) => fakes.autoUpdater.emit('error', new Error(message));

    it('stay quiet for a background check, because being offline is normal', async () => {
      await start();
      await vi.advanceTimersByTimeAsync(LAUNCH_CHECK_DELAY_MS);
      failWith('Offline');

      expect(currentPhase()).toBe(UPDATE_PHASES.idle);
      expect(fakes.logError).toHaveBeenCalledTimes(1);
    });

    it('show for a check the user asked for', async () => {
      await start();
      await invoke('updates:check');
      failWith('Offline');

      expect(currentPhase()).toBe(UPDATE_PHASES.failed);
    });

    it('show for a download, even one started in the background', async () => {
      await start();
      await vi.advanceTimersByTimeAsync(LAUNCH_CHECK_DELAY_MS);
      fakes.autoUpdater.emit('update-available', { version: '1.1.0' });
      failWith('Cut off');

      expect(currentPhase()).toBe(UPDATE_PHASES.failed);
    });

    it('can be retried', async () => {
      await start();
      await invoke('updates:check');
      failWith('Offline');
      await invoke('updates:check');

      expect(fakes.autoUpdater.checkForUpdates).toHaveBeenCalledTimes(2);
    });

    it('keep a known update when a later background check fails, so it can still be downloaded', async () => {
      fakes.settings = { autoUpdate: false };

      await start();
      await vi.advanceTimersByTimeAsync(LAUNCH_CHECK_DELAY_MS);
      fakes.autoUpdater.emit('update-available', { version: '1.1.0' });

      changeAutoUpdate(true);
      await vi.advanceTimersByTimeAsync(0);
      fakes.autoUpdater.emit('checking-for-update');
      failWith('Offline');

      expect(invoke('updates:get-state')).toMatchObject({ phase: UPDATE_PHASES.available, availableVersion: '1.1.0' });
    });

    it('show when installing fails, even if the last check ran in the background', async () => {
      await start();
      await vi.advanceTimersByTimeAsync(LAUNCH_CHECK_DELAY_MS);
      fakes.autoUpdater.emit('update-downloaded', { version: '1.1.0' });

      await invoke('updates:install');
      failWith('No update filepath provided');

      expect(currentPhase()).toBe(UPDATE_PHASES.failed);
    });

    it('do not claim the copy cannot update if the updater fails to load, and allow a retry', async () => {
      vi.doMock('electron-updater', () => {
        throw new Error('Broken package');
      });

      await start();
      await expect(invoke('updates:check')).resolves.toBeUndefined();

      expect(currentPhase()).toBe(UPDATE_PHASES.failed);
      expect(fakes.logError).toHaveBeenCalledTimes(1);

      await invoke('updates:check');
      expect(fakes.logError).toHaveBeenCalledTimes(2);

      vi.doMock('electron-updater', () => ({
        default: {
          get autoUpdater() {
            return fakes.autoUpdater;
          },
        },
      }));
    });
  });

  describe('changing the switch during a check', () => {
    const startCheck = async () => {
      await start();
      await invoke('updates:check');
      fakes.autoUpdater.emit('checking-for-update');
    };

    it('downloads the result when turned on, even though a new check cannot start', async () => {
      fakes.settings = { autoUpdate: false };

      await startCheck();
      changeAutoUpdate(true);
      await vi.advanceTimersByTimeAsync(0);

      expect(fakes.autoUpdater.autoDownload).toBe(true);
      expect(fakes.autoUpdater.checkForUpdates).toHaveBeenCalledTimes(1);
    });

    it('does not download against the setting when turned off', async () => {
      await startCheck();
      changeAutoUpdate(false);
      await vi.advanceTimersByTimeAsync(0);

      expect(fakes.autoUpdater.autoDownload).toBe(false);
    });
  });

  it('keeps the updater’s own messages in the log', async () => {
    await start();
    await invoke('updates:check');
    fakes.autoUpdater.logger.warn('install call ignored');

    expect(fakes.logInfo).toHaveBeenCalledWith('Updater: install call ignored');
  });

  describe('restarting the app', () => {
    it('installs a ready update and reopens, instead of restarting and installing at the same moment', async () => {
      await start();
      await invoke('updates:check');
      fakes.autoUpdater.emit('update-downloaded', { version: '1.1.0' });

      expect(fakes.pendingUpdateInstaller()).toBe(true);
      await vi.advanceTimersByTimeAsync(0);

      expect(fakes.autoUpdater.quitAndInstall).toHaveBeenCalledExactlyOnceWith(true, true);
    });

    it('leaves a normal restart alone with nothing ready', async () => {
      await start();

      expect(fakes.pendingUpdateInstaller()).toBe(false);
      expect(fakes.autoUpdater.quitAndInstall).not.toHaveBeenCalled();
    });
  });

  describe('once downloaded', () => {
    const reachReady = async () => {
      await start();
      await invoke('updates:check');
      fakes.autoUpdater.emit('update-downloaded', { version: '1.1.0' });
    };

    it('tells the page and stops checking', async () => {
      await reachReady();
      expect(currentPhase()).toBe(UPDATE_PHASES.ready);

      await invoke('updates:check');
      expect(fakes.autoUpdater.checkForUpdates).toHaveBeenCalledTimes(1);
    });

    it('installs silently and reopens when asked', async () => {
      await reachReady();
      await invoke('updates:install');

      expect(fakes.autoUpdater.quitAndInstall).toHaveBeenCalledExactlyOnceWith(true, true);
    });

    it('never installs before it is ready', async () => {
      await start();
      await invoke('updates:install');

      expect(fakes.autoUpdater.quitAndInstall).not.toHaveBeenCalled();
    });
  });

  it('says so when already on the latest version', async () => {
    await start();
    await invoke('updates:check');
    fakes.autoUpdater.emit('update-not-available', { version: '1.0.0' });

    expect(currentPhase()).toBe(UPDATE_PHASES.upToDate);
  });
});
