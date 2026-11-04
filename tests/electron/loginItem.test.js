import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fakes = vi.hoisted(() => ({ configFolder: '', isPackaged: true, logError: vi.fn() }));

vi.mock('electron', () => ({
  app: {
    getPath: () => fakes.configFolder,

    get isPackaged() {
      return fakes.isPackaged;
    },
  },
}));

vi.mock('../../electron/logger.js', () => ({ logError: fakes.logError, logInfo: () => {} }));

const { opensAtLogin, refreshLoginItem, setOpensAtLogin } = await import('../../electron/loginItem.js');

const realPlatform = process.platform;
const realAppImage = process.env.APPIMAGE;

const autostartFile = () => path.join(fakes.configFolder, 'autostart', 'shiori.desktop');

const autostartLine = (key) =>
  fs
    .readFileSync(autostartFile(), 'utf8')
    .split('\n')
    .find((line) => line.startsWith(`${key}=`));

describe('login item on Linux', () => {
  beforeEach(() => {
    fakes.configFolder = fs.mkdtempSync(path.join(os.tmpdir(), 'shiori-autostart-'));
    fakes.isPackaged = true;
    fakes.logError.mockReset();
    Object.defineProperty(process, 'platform', { value: 'linux' });
    process.env.APPIMAGE = '/home/me/Apps/Shiori.AppImage';
  });

  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: realPlatform });

    if (realAppImage === undefined) delete process.env.APPIMAGE;
    else process.env.APPIMAGE = realAppImage;

    fs.rmSync(fakes.configFolder, { recursive: true, force: true });
  });

  it('is off until the entry exists', () => {
    expect(opensAtLogin()).toBe(false);

    setOpensAtLogin(true);
    expect(opensAtLogin()).toBe(true);

    setOpensAtLogin(false);
    expect(opensAtLogin()).toBe(false);
  });

  it('starts the AppImage file itself, since its running copy lives in a temporary folder', () => {
    setOpensAtLogin(true);

    expect(autostartLine('Exec')).toBe('Exec="/home/me/Apps/Shiori.AppImage" --start-in-tray');
    expect(autostartLine('TryExec')).toBe('TryExec=/home/me/Apps/Shiori.AppImage');
  });

  it('starts the installed program for other packages', () => {
    delete process.env.APPIMAGE;
    setOpensAtLogin(true);

    expect(autostartLine('TryExec')).toContain(process.execPath.replaceAll('\\', '\\\\'));
  });

  it('quotes a path the way the desktop entry format requires', () => {
    process.env.APPIMAGE = '/home/me/My Apps/100% $hiori "new".AppImage';
    setOpensAtLogin(true);

    expect(autostartLine('Exec')).toBe(
      'Exec="/home/me/My Apps/100%% \\\\$hiori \\\\"new\\\\".AppImage" --start-in-tray',
    );
  });

  it('follows the AppImage when it moves, so the entry keeps working', () => {
    setOpensAtLogin(true);
    process.env.APPIMAGE = '/opt/moved/Shiori.AppImage';
    refreshLoginItem();

    expect(autostartLine('TryExec')).toBe('TryExec=/opt/moved/Shiori.AppImage');
  });

  it('does not add an entry the user never asked for', () => {
    refreshLoginItem();

    expect(fs.existsSync(autostartFile())).toBe(false);
  });

  it('never writes an entry outside the installed app, where it would register the wrong program', () => {
    fakes.isPackaged = false;
    setOpensAtLogin(true);

    expect(fs.existsSync(autostartFile())).toBe(false);
    expect(opensAtLogin()).toBe(false);
  });

  it('logs a failure and reports off instead of throwing', () => {
    fs.writeFileSync(path.join(fakes.configFolder, 'autostart'), 'a file where the folder should be');

    expect(() => setOpensAtLogin(true)).not.toThrow();
    expect(fakes.logError).toHaveBeenCalledTimes(1);
    expect(opensAtLogin()).toBe(false);
  });
});
