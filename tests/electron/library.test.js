import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const folders = vi.hoisted(() => ({ userData: '', downloads: '' }));

vi.mock('electron', () => ({
  app: { getPath: (name) => folders[name] },
  BrowserWindow: { fromWebContents: () => null },
  dialog: {},
  ipcMain: { handle: () => {} },
  shell: {},
}));

const settingsFile = () => path.join(folders.userData, 'settings.json');

const scanWithFolder = async (downloadDir) => {
  fs.writeFileSync(settingsFile(), JSON.stringify(downloadDir ? { downloadDir } : {}));
  vi.resetModules();

  const { scanLibrary } = await import('../../electron/ipc/library.js');

  return scanLibrary();
};

describe('scanLibrary', () => {
  let testFolder = '';

  beforeEach(() => {
    testFolder = fs.mkdtempSync(path.join(os.tmpdir(), 'shiori-scan-'));
    folders.userData = path.join(testFolder, 'AppData');
    folders.downloads = path.join(testFolder, 'Downloads');
    fs.mkdirSync(folders.userData, { recursive: true });
  });

  afterEach(() => fs.rmSync(testFolder, { recursive: true, force: true }));

  it('lists video files from a reachable folder', async () => {
    const downloadDir = path.join(testFolder, 'Anime');

    fs.mkdirSync(path.join(downloadDir, 'Show'), { recursive: true });
    fs.writeFileSync(path.join(downloadDir, 'Show', 'Show - 01.mkv'), '');
    fs.writeFileSync(path.join(downloadDir, 'Show', 'notes.txt'), '');

    const scan = await scanWithFolder(downloadDir);

    expect(scan.isUnreachable).toBe(false);
    expect(scan.files.map((file) => file.name)).toEqual(['Show - 01.mkv']);
  });

  it('treats a reachable empty folder as truly empty', async () => {
    const downloadDir = path.join(testFolder, 'Empty');

    fs.mkdirSync(downloadDir);
    expect(await scanWithFolder(downloadDir)).toEqual({ root: downloadDir, files: [], isUnreachable: false });
  });

  it('reports a chosen folder that cannot be read as unreachable, not empty', async () => {
    const downloadDir = path.join(testFolder, 'unplugged-drive', 'Anime');

    expect(await scanWithFolder(downloadDir)).toEqual({ root: downloadDir, files: [], isUnreachable: true });
  });

  it('accepts the app’s own default folder before anything has been downloaded', async () => {
    const scan = await scanWithFolder(null);

    expect(scan).toEqual({ root: path.join(folders.userData, 'Downloads'), files: [], isUnreachable: false });
  });

  it('keeps scanning past a subfolder it may not open', async () => {
    const downloadDir = path.join(testFolder, 'Anime');

    fs.mkdirSync(path.join(downloadDir, 'Show'), { recursive: true });
    fs.writeFileSync(path.join(downloadDir, 'Show', 'Show - 02.mkv'), '');

    const readdir = fs.promises.readdir;

    const readdirSpy = vi
      .spyOn(fs.promises, 'readdir')
      .mockImplementation((folder, options) =>
        String(folder).endsWith('System Volume Information')
          ? Promise.reject(Object.assign(new Error('denied'), { code: 'EPERM' }))
          : readdir(folder, options),
      );

    fs.mkdirSync(path.join(downloadDir, 'System Volume Information'));

    const scan = await scanWithFolder(downloadDir);

    readdirSpy.mockRestore();
    expect(scan.isUnreachable).toBe(false);
    expect(scan.files.map((file) => file.name)).toEqual(['Show - 02.mkv']);
  });
});
