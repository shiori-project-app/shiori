import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fakes = vi.hoisted(() => ({ home: '', isPackaged: true, logError: vi.fn() }));

vi.mock('electron', () => ({
  app: {
    getPath: () => fakes.home,

    get isPackaged() {
      return fakes.isPackaged;
    },
  },
}));

vi.mock('../../electron/logger.js', () => ({ logError: fakes.logError, logInfo: () => {} }));

const { refreshLauncherEntry } = await import('../../electron/linuxLauncherEntry.js');

const SYSTEM_ENTRY_FILE = '/usr/share/applications/shiori.desktop';
const realPlatform = process.platform;
const realEnvironment = process.env;
const realExistsSync = fs.existsSync;

const dataFile = (...parts) => path.join(fakes.home, '.local', 'share', ...parts);
const entryFile = () => dataFile('applications', 'shiori.desktop');
const iconFile = () => dataFile('icons', 'hicolor', '512x512', 'apps', 'shiori.png');

const pretendSystemEntryExists = (exists) =>
  vi.spyOn(fs, 'existsSync').mockImplementation((file) => (file === SYSTEM_ENTRY_FILE ? exists : realExistsSync(file)));

const entryLines = () => fs.readFileSync(entryFile(), 'utf8').split('\n');

describe('linux launcher entry', () => {
  beforeEach(() => {
    fakes.home = fs.mkdtempSync(path.join(os.tmpdir(), 'shiori-launcher-'));
    fakes.isPackaged = true;
    fakes.logError.mockReset();
    Object.defineProperty(process, 'platform', { value: 'linux' });
    process.env = {
      ...realEnvironment,
      APPIMAGE: '/home/me/Apps/Shiori.AppImage',
      APPDIR: path.dirname(process.execPath),
    };

    delete process.env.XDG_DATA_HOME;
    pretendSystemEntryExists(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(process, 'platform', { value: realPlatform });
    process.env = realEnvironment;
    fs.rmSync(fakes.home, { recursive: true, force: true });
  });

  it('adds an entry and icon that a Wayland bar can match to the window', () => {
    refreshLauncherEntry();

    expect(entryLines()).toEqual(
      expect.arrayContaining(['Icon=shiori', 'StartupWMClass=shiori', 'Exec="/home/me/Apps/Shiori.AppImage"']),
    );

    expect(fs.readFileSync(iconFile()).equals(fs.readFileSync('build/icon.png'))).toBe(true);
  });

  it('follows an AppImage that has moved', () => {
    refreshLauncherEntry();
    process.env.APPIMAGE = '/home/me/Other/Shiori.AppImage';
    refreshLauncherEntry();

    expect(entryLines()).toContain('TryExec=/home/me/Other/Shiori.AppImage');
  });

  it('uses XDG_DATA_HOME when it is set', () => {
    process.env.XDG_DATA_HOME = path.join(fakes.home, 'custom');
    refreshLauncherEntry();

    expect(fs.existsSync(path.join(fakes.home, 'custom', 'applications', 'shiori.desktop'))).toBe(true);
  });

  it('ignores a relative XDG_DATA_HOME, as the specification requires', () => {
    process.env.XDG_DATA_HOME = 'relative/share';
    refreshLauncherEntry();

    expect(fs.existsSync(entryFile())).toBe(true);
  });

  it('points at the running program when APPIMAGE was inherited from another AppImage', () => {
    process.env.APPDIR = '/tmp/.mount_Editor';
    refreshLauncherEntry();

    expect(entryLines().find((line) => line.startsWith('TryExec='))).not.toContain('Shiori.AppImage');
  });

  it.each([
    ['replaces', false],
    ['removes', true],
  ])('never %s an entry the user made', (_action, systemEntryExists) => {
    fs.mkdirSync(path.dirname(entryFile()), { recursive: true });
    fs.writeFileSync(entryFile(), '[Desktop Entry]\nExec=my-own-shiori --flag\n');
    pretendSystemEntryExists(systemEntryExists);
    refreshLauncherEntry();

    expect(entryLines()).toContain('Exec=my-own-shiori --flag');
  });

  it('removes its own files once a package provides the entry, so they stop hiding it', () => {
    refreshLauncherEntry();
    pretendSystemEntryExists(true);
    refreshLauncherEntry();

    expect(fs.existsSync(entryFile())).toBe(false);
    expect(fs.existsSync(iconFile())).toBe(false);
  });

  it.each([
    ['on Windows', () => Object.defineProperty(process, 'platform', { value: 'win32' })],
    ['in development', () => (fakes.isPackaged = false)],
  ])('writes nothing %s', (_name, arrange) => {
    arrange();
    refreshLauncherEntry();

    expect(fs.existsSync(dataFile())).toBe(false);
  });

  it('logs a failure instead of stopping the app from starting', () => {
    fs.writeFileSync(path.join(fakes.home, '.local'), '');

    expect(() => refreshLauncherEntry()).not.toThrow();
    expect(fakes.logError).toHaveBeenCalledTimes(1);
  });
});
