import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const folders = vi.hoisted(() => ({ userData: '', downloads: '', videos: '' }));
const appendSwitch = vi.hoisted(() => vi.fn());

vi.mock('electron', () => ({
  app: { getPath: (name) => folders[name], commandLine: { appendSwitch } },
  BrowserWindow: { fromWebContents: () => null },
  dialog: {},
  ipcMain: { handle: () => {} },
  shell: {},
}));

const settingsFile = () => path.join(folders.userData, 'settings.json');

const loadSettings = async () => {
  vi.resetModules();

  const { getSettings } = await import('../../electron/ipc/settings.js');

  return getSettings();
};

const realPlatform = process.platform;

const pretendPlatformIs = (platform) => Object.defineProperty(process, 'platform', { value: platform });

describe('download folder default', () => {
  let testFolder = '';

  beforeEach(() => {
    testFolder = fs.mkdtempSync(path.join(os.tmpdir(), 'shiori-settings-'));
    folders.userData = path.join(testFolder, 'AppData', 'Shiori');
    folders.downloads = path.join(testFolder, 'Downloads');
    folders.videos = path.join(testFolder, 'Videos');
    pretendPlatformIs('win32');
    fs.mkdirSync(folders.userData, { recursive: true });
  });

  afterEach(() => {
    pretendPlatformIs(realPlatform);
    fs.rmSync(testFolder, { recursive: true, force: true });
  });

  it('downloads into the app’s own folder on a fresh install', async () => {
    expect((await loadSettings()).downloadDir).toBe(path.join(folders.userData, 'Downloads'));
    expect(fs.existsSync(settingsFile())).toBe(false);
  });

  it('downloads into the Videos folder on Linux, where the app’s own folder is hidden in .config', async () => {
    pretendPlatformIs('linux');

    expect((await loadSettings()).downloadDir).toBe(path.join(folders.videos, 'Shiori'));
  });

  it('keeps using DownloadsShiori for someone who already has it, and remembers that', async () => {
    fs.mkdirSync(path.join(folders.downloads, 'Shiori'), { recursive: true });
    fs.writeFileSync(settingsFile(), JSON.stringify({ maxParallelDownloads: 3 }));

    const settings = await loadSettings();

    expect(settings).toMatchObject({ downloadDir: path.join(folders.downloads, 'Shiori'), maxParallelDownloads: 3 });

    expect(JSON.parse(fs.readFileSync(settingsFile(), 'utf8')).downloadDir).toBe(
      path.join(folders.downloads, 'Shiori'),
    );
  });

  it('never overrides a folder the user chose', async () => {
    fs.mkdirSync(path.join(folders.downloads, 'Shiori'), { recursive: true });
    fs.writeFileSync(settingsFile(), JSON.stringify({ downloadDir: 'D:Anime' }));
    expect((await loadSettings()).downloadDir).toBe('D:Anime');
  });
});

describe('smooth graphics setting', () => {
  let testFolder = '';

  const loadSettingsModule = async () => {
    vi.resetModules();

    return import('../../electron/ipc/settings.js');
  };

  beforeEach(() => {
    testFolder = fs.mkdtempSync(path.join(os.tmpdir(), 'shiori-settings-'));
    folders.userData = path.join(testFolder, 'AppData', 'Shiori');
    folders.downloads = path.join(testFolder, 'Downloads');
    fs.mkdirSync(folders.userData, { recursive: true });
    appendSwitch.mockClear();
  });

  afterEach(() => fs.rmSync(testFolder, { recursive: true, force: true }));

  it('stays off and adds no switch on a fresh install', async () => {
    const { applyGraphicsSettingAtLaunch, getSettings } = await loadSettingsModule();

    applyGraphicsSettingAtLaunch();
    expect(getSettings().smoothGraphics).toBe(false);
    expect(appendSwitch).not.toHaveBeenCalled();
  });

  it('adds the switch at launch when it was saved on', async () => {
    fs.writeFileSync(settingsFile(), JSON.stringify({ smoothGraphics: true }));

    const { applyGraphicsSettingAtLaunch } = await loadSettingsModule();

    applyGraphicsSettingAtLaunch();
    expect(appendSwitch).toHaveBeenCalledWith('disable-gpu-compositing');
  });

  it('saves a change but reports the launch value until the app restarts', async () => {
    const { applyGraphicsSettingAtLaunch, updateGraphicsSetting } = await loadSettingsModule();

    applyGraphicsSettingAtLaunch();

    expect(updateGraphicsSetting({ smoothGraphics: true })).toMatchObject({
      smoothGraphics: true,
      smoothGraphicsAtLaunch: false,
    });

    const savedSettings = JSON.parse(fs.readFileSync(settingsFile(), 'utf8'));

    expect(savedSettings.smoothGraphics).toBe(true);
    expect(savedSettings.smoothGraphicsAtLaunch).toBeUndefined();
    expect(appendSwitch).not.toHaveBeenCalled();
  });

  it('treats anything but true as off', async () => {
    const { updateGraphicsSetting } = await loadSettingsModule();

    expect(updateGraphicsSetting({ smoothGraphics: 'yes' }).smoothGraphics).toBe(false);
    expect(updateGraphicsSetting(null).smoothGraphics).toBe(false);
  });
});
