import { EventEmitter } from 'node:events';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const electronFakes = vi.hoisted(() => ({
  appEvents: null,
  quit: vi.fn(),
  windows: [],
  trays: [],
  menuTemplate: null,
  iconIsEmpty: false,
  settings: { keepRunningInTray: false },
  settingsListeners: [],
  logError: vi.fn(),
  desktopHasTray: true,
}));

vi.mock('electron', () => {
  class FakeTray {
    constructor(icon) {
      this.icon = icon;
      this.handlers = {};
      this.destroy = vi.fn();
      this.setToolTip = vi.fn();
      this.setContextMenu = vi.fn();
      electronFakes.trays.push(this);
    }

    on(eventName, handler) {
      this.handlers[eventName] = handler;
    }
  }

  return {
    app: {
      on: (eventName, handler) => electronFakes.appEvents.on(eventName, handler),
      quit: electronFakes.quit,
    },

    BrowserWindow: { getAllWindows: () => electronFakes.windows },

    Menu: {
      buildFromTemplate: (template) => {
        electronFakes.menuTemplate = template;

        return template;
      },
    },

    nativeImage: {
      createFromPath: () => ({ isEmpty: () => electronFakes.iconIsEmpty, resize: () => 'tray icon' }),
    },

    Tray: FakeTray,
  };
});

vi.mock('../../electron/ipc/settings.js', () => ({
  getSettings: () => electronFakes.settings,
  onSettingsChanged: (listener) => electronFakes.settingsListeners.push(listener),
}));

vi.mock('../../electron/linuxDesktop.js', () => ({ desktopHasTray: () => electronFakes.desktopHasTray }));

vi.mock('../../electron/logger.js', () => ({ logError: electronFakes.logError, logInfo: () => {} }));

const fakeWindow = () =>
  Object.assign(new EventEmitter(), {
    isMinimized: vi.fn(() => false),
    restore: vi.fn(),
    show: vi.fn(),
    hide: vi.fn(),
    focus: vi.fn(),
    webContents: { send: vi.fn() },
  });

const closeWindow = (mainWindow) => {
  const event = { preventDefault: vi.fn() };

  mainWindow.emit('close', event);

  return event;
};

const startWithTraySetting = async (keepRunningInTray) => {
  vi.resetModules();
  electronFakes.appEvents = new EventEmitter();
  electronFakes.windows = [fakeWindow()];
  electronFakes.trays = [];
  electronFakes.settingsListeners = [];
  electronFakes.settings = { keepRunningInTray };
  electronFakes.iconIsEmpty = false;

  const tray = await import('../../electron/tray.js');

  tray.startTray();

  const [mainWindow] = electronFakes.windows;

  tray.keepWindowInTrayOnClose(mainWindow);

  return { tray, mainWindow };
};

const changeSetting = (keepRunningInTray) =>
  electronFakes.settingsListeners.forEach((listener) => listener({ keepRunningInTray }));

const menuItemNamed = (label) => electronFakes.menuTemplate.find((item) => item.label === label);

describe('tray', () => {
  beforeEach(() => {
    electronFakes.quit.mockReset();
    electronFakes.logError.mockReset();
    electronFakes.desktopHasTray = true;
  });

  describe('with the setting off', () => {
    it('shows no icon, and closing the window closes it normally', async () => {
      const { mainWindow } = await startWithTraySetting(false);
      const event = closeWindow(mainWindow);

      expect(electronFakes.trays).toEqual([]);
      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(mainWindow.hide).not.toHaveBeenCalled();
    });
  });

  describe('with the setting on', () => {
    it('hides the window on close instead of quitting, and tells the page', async () => {
      const { mainWindow } = await startWithTraySetting(true);
      const event = closeWindow(mainWindow);

      expect(event.preventDefault).toHaveBeenCalledTimes(1);
      expect(mainWindow.hide).toHaveBeenCalledTimes(1);
      expect(mainWindow.webContents.send).toHaveBeenCalledWith('window:hidden-to-tray');
    });

    it('lets the window close once the app is quitting', async () => {
      const { mainWindow } = await startWithTraySetting(true);

      electronFakes.appEvents.emit('before-quit');

      const event = closeWindow(mainWindow);

      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(mainWindow.hide).not.toHaveBeenCalled();
    });

    it('quits properly at Windows shutdown, so saves run and shutdown is not blocked', async () => {
      const { mainWindow } = await startWithTraySetting(true);

      mainWindow.emit('session-end');

      expect(electronFakes.quit).toHaveBeenCalledTimes(1);
      expect(closeWindow(mainWindow).preventDefault).not.toHaveBeenCalled();
    });

    it('reopens the window from a click on the icon', async () => {
      const { mainWindow } = await startWithTraySetting(true);

      closeWindow(mainWindow);
      electronFakes.trays[0].handlers.click();

      expect(mainWindow.show).toHaveBeenCalledTimes(1);
      expect(mainWindow.focus).toHaveBeenCalledTimes(1);
    });

    it('offers Open and Quit in its menu', async () => {
      const { mainWindow } = await startWithTraySetting(true);

      menuItemNamed('Open Shiori').click();
      expect(mainWindow.show).toHaveBeenCalledTimes(1);

      menuItemNamed('Quit Shiori').click();
      expect(electronFakes.quit).toHaveBeenCalledTimes(1);
    });
  });

  describe('if the icon cannot be created', () => {
    it('logs it and closes normally, so the app can never get stuck with no way back in', async () => {
      vi.resetModules();
      electronFakes.appEvents = new EventEmitter();
      electronFakes.windows = [fakeWindow()];
      electronFakes.trays = [];
      electronFakes.settingsListeners = [];
      electronFakes.settings = { keepRunningInTray: true };
      electronFakes.iconIsEmpty = true;

      const tray = await import('../../electron/tray.js');
      const [mainWindow] = electronFakes.windows;

      tray.startTray();
      tray.keepWindowInTrayOnClose(mainWindow);

      expect(electronFakes.logError).toHaveBeenCalledTimes(1);
      expect(closeWindow(mainWindow).preventDefault).not.toHaveBeenCalled();
    });
  });

  describe('on a Linux desktop with nowhere to show the icon', () => {
    beforeEach(() => {
      electronFakes.desktopHasTray = false;
    });

    it('makes no icon and closes normally, or the app would hide with no way to quit', async () => {
      const { mainWindow } = await startWithTraySetting(true);

      expect(electronFakes.trays).toEqual([]);
      expect(closeWindow(mainWindow).preventDefault).not.toHaveBeenCalled();
    });

    it('shows the window at login instead of staying invisible', async () => {
      const originalArguments = process.argv;

      process.argv = [...originalArguments, '--start-in-tray'];

      const { tray } = await startWithTraySetting(true);
      const opensInTray = tray.opensInTray();

      process.argv = originalArguments;

      expect(opensInTray).toBe(false);
    });
  });

  describe('when the setting changes', () => {
    it('adds the icon when turned on, once', async () => {
      await startWithTraySetting(false);

      changeSetting(true);
      changeSetting(true);

      expect(electronFakes.trays).toHaveLength(1);
    });

    it('removes the icon when turned off, and closing quits again', async () => {
      const { mainWindow } = await startWithTraySetting(true);

      changeSetting(false);

      expect(electronFakes.trays[0].destroy).toHaveBeenCalledTimes(1);
      expect(closeWindow(mainWindow).preventDefault).not.toHaveBeenCalled();
    });
  });

  describe('showMainWindow', () => {
    it('restores a minimized window', async () => {
      const { tray, mainWindow } = await startWithTraySetting(false);

      mainWindow.isMinimized.mockReturnValue(true);
      tray.showMainWindow();

      expect(mainWindow.restore).toHaveBeenCalledTimes(1);
      expect(mainWindow.show).toHaveBeenCalledTimes(1);
    });

    it('does nothing without a window', async () => {
      const { tray } = await startWithTraySetting(false);

      electronFakes.windows = [];

      expect(() => tray.showMainWindow()).not.toThrow();
    });
  });

  describe('opensInTray', () => {
    const withStartArgument = async (keepRunningInTray) => {
      const originalArguments = process.argv;

      process.argv = [...originalArguments, '--start-in-tray'];

      const { tray } = await startWithTraySetting(keepRunningInTray);
      const result = tray.opensInTray();

      process.argv = originalArguments;

      return result;
    };

    it('stays hidden when started at login with the tray on', async () => {
      await expect(withStartArgument(true)).resolves.toBe(true);
    });

    it('shows the window at login when the tray is off, so it is never invisible', async () => {
      await expect(withStartArgument(false)).resolves.toBe(false);
    });

    it('shows the window for a normal launch', async () => {
      const { tray } = await startWithTraySetting(true);

      expect(tray.opensInTray()).toBe(false);
    });
  });
});
