import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fakes = vi.hoisted(() => ({
  userData: '',
  isPackaged: true,
  handlers: new Map(),
  getLoginItemSettings: vi.fn(),
  setLoginItemSettings: vi.fn(),
}));

vi.mock('electron', () => ({
  app: {
    getPath: () => fakes.userData,

    get isPackaged() {
      return fakes.isPackaged;
    },

    getLoginItemSettings: fakes.getLoginItemSettings,
    setLoginItemSettings: fakes.setLoginItemSettings,
    commandLine: { appendSwitch: () => {} },
  },

  BrowserWindow: { fromWebContents: () => null },
  dialog: {},
  ipcMain: { handle: (channel, handler) => fakes.handlers.set(channel, handler) },
  shell: {},
}));

const loadHandlers = async () => {
  vi.resetModules();

  const { registerSettingsHandlers } = await import('../../electron/ipc/settings.js');

  registerSettingsHandlers();

  return {
    getSettings: () => fakes.handlers.get('settings:get')(),
    update: (changes) => fakes.handlers.get('settings:update-background')({}, changes),
  };
};

const savedSettings = () => JSON.parse(fs.readFileSync(path.join(fakes.userData, 'settings.json'), 'utf8'));

const realPlatform = process.platform;

const pretendPlatformIs = (platform) => Object.defineProperty(process, 'platform', { value: platform });

describe('background settings', () => {
  beforeEach(() => {
    fakes.userData = fs.mkdtempSync(path.join(os.tmpdir(), 'shiori-background-'));
    fakes.isPackaged = true;
    pretendPlatformIs('win32');
    fakes.getLoginItemSettings.mockReset().mockReturnValue({ openAtLogin: false });
    fakes.setLoginItemSettings.mockReset();
  });

  afterEach(() => {
    pretendPlatformIs(realPlatform);
    fs.rmSync(fakes.userData, { recursive: true, force: true });
  });

  it('starts with both off', async () => {
    const { getSettings } = await loadHandlers();

    expect(getSettings()).toMatchObject({ keepRunningInTray: false, startAtLogin: false });
  });

  it('saves keeping running in the tray', async () => {
    const { update } = await loadHandlers();

    await expect(update({ keepRunningInTray: true })).toMatchObject({ keepRunningInTray: true });
    expect(savedSettings().keepRunningInTray).toBe(true);
    expect(fakes.setLoginItemSettings).not.toHaveBeenCalled();
  });

  it('registers with Windows to open in the tray at sign-in', async () => {
    const { update } = await loadHandlers();

    update({ startAtLogin: true });

    expect(fakes.setLoginItemSettings).toHaveBeenCalledExactlyOnceWith({
      path: process.execPath,
      args: ['--start-in-tray'],
      openAtLogin: true,
    });
  });

  it('asks Windows with the same details, or it would always answer no', async () => {
    const { getSettings } = await loadHandlers();

    getSettings();

    expect(fakes.getLoginItemSettings).toHaveBeenCalledWith({
      path: process.execPath,
      args: ['--start-in-tray'],
    });
  });

  it('reads starting with Windows from Windows, not the settings file, so it stays true if changed elsewhere', async () => {
    fakes.getLoginItemSettings.mockReturnValue({ openAtLogin: true });

    const { getSettings } = await loadHandlers();

    expect(getSettings().startAtLogin).toBe(true);
  });

  it('never touches Windows outside the installed app, where it would register the wrong program', async () => {
    fakes.isPackaged = false;

    const { getSettings, update } = await loadHandlers();

    expect(update({ startAtLogin: true })).toMatchObject({ startAtLogin: false, canStartAtLogin: false });
    expect(getSettings().canStartAtLogin).toBe(false);
    expect(fakes.setLoginItemSettings).not.toHaveBeenCalled();
    expect(fakes.getLoginItemSettings).not.toHaveBeenCalled();
  });

  it.each([
    ['text', { keepRunningInTray: 'yes', startAtLogin: 'yes' }],
    ['nothing', undefined],
  ])('ignores %s from the page', async (_name, changes) => {
    const { getSettings, update } = await loadHandlers();

    update(changes);

    expect(fakes.setLoginItemSettings).not.toHaveBeenCalled();
    expect(getSettings().keepRunningInTray).toBe(false);
  });

  describe('on Linux', () => {
    const autostartFile = () => path.join(fakes.userData, 'autostart', 'shiori.desktop');

    beforeEach(() => pretendPlatformIs('linux'));

    it('turns on and off through the autostart entry, because Electron has no login item there', async () => {
      const { getSettings, update } = await loadHandlers();

      expect(update({ startAtLogin: true })).toMatchObject({ startAtLogin: true, canStartAtLogin: true });
      expect(fs.existsSync(autostartFile())).toBe(true);
      expect(fakes.setLoginItemSettings).not.toHaveBeenCalled();

      expect(update({ startAtLogin: false })).toMatchObject({ startAtLogin: false });
      expect(fs.existsSync(autostartFile())).toBe(false);
      expect(getSettings().startAtLogin).toBe(false);
    });

    it('tells the page which system it is on', async () => {
      const { getSettings } = await loadHandlers();

      expect(getSettings().platform).toBe('linux');
    });
  });
});
