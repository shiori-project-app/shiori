import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const handlers = vi.hoisted(() => new Map());
const settings = vi.hoisted(() => ({ downloadDir: '', cleanupMoveFolder: null }));
const jobs = vi.hoisted(() => ({ list: [] }));
const trashItem = vi.hoisted(() => vi.fn());
const showOpenDialog = vi.hoisted(() => vi.fn());
const saveCleanupMoveFolder = vi.hoisted(() => vi.fn());

vi.mock('electron', () => ({
  app: { getPath: () => os.tmpdir() },
  BrowserWindow: { fromWebContents: () => null },
  dialog: { showOpenDialog },
  ipcMain: { handle: (channel, handler) => handlers.set(channel, handler) },
  shell: { trashItem },
}));

vi.mock('../../electron/ipc/settings.js', () => ({
  getSettings: () => settings,
  saveCleanupMoveFolder,
  settingsForPage: (shownSettings) => shownSettings,
}));

vi.mock('../../electron/downloads/queueStore.js', () => ({ allJobs: () => jobs.list }));
vi.mock('../../electron/logger.js', () => ({ logError: () => {}, logInfo: () => {} }));

const { registerCleanupHandlers } = await import('../../electron/ipc/cleanup.js');

registerCleanupHandlers();

const invoke = (channel, ...args) => handlers.get(channel)({ sender: {} }, ...args);

const clean = (relativePath, action = 'trash') => invoke('cleanup:clean-file', { relativePath, action });

const EPISODE = path.join('Show', 'Show - 01.mkv');
const EPISODE_CONTENT = 'episode bytes';

describe('cleanup handlers', () => {
  let testFolder = '';
  let episodeFile = '';

  const writeFile = (filePath, content = EPISODE_CONTENT) => {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);

    return filePath;
  };

  const inDownloads = (relativePath) => path.join(settings.downloadDir, relativePath);

  beforeEach(() => {
    testFolder = fs.mkdtempSync(path.join(os.tmpdir(), 'shiori-cleanup-'));
    settings.downloadDir = path.join(testFolder, 'Anime');
    settings.cleanupMoveFolder = path.join(testFolder, 'Archive');
    fs.mkdirSync(settings.cleanupMoveFolder);
    episodeFile = writeFile(inDownloads(EPISODE));
    jobs.list = [];
    trashItem.mockReset();
    trashItem.mockResolvedValue(undefined);
    showOpenDialog.mockReset();
    saveCleanupMoveFolder.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(testFolder, { recursive: true, force: true });
  });

  describe('files it refuses', () => {
    it.each([
      ['a path outside the download folder', path.join('..', 'Archive', 'other.mkv')],
      ['a file that is not a video', path.join('Show', 'notes.txt')],
      ['an unfinished qBittorrent file', path.join('Show', 'Show - 02.mkv.!qB')],
      ['an unfinished Shiori download', path.join('Show', 'Show - 03.mkv.part')],
    ])('%s', async (_name, relativePath) => {
      writeFile(path.resolve(settings.downloadDir, relativePath));

      await expect(clean(relativePath)).rejects.toThrow();
      expect(trashItem).not.toHaveBeenCalled();
      expect(fs.existsSync(path.resolve(settings.downloadDir, relativePath))).toBe(true);
    });

    it('a folder with a video name', async () => {
      fs.mkdirSync(inDownloads('Folder.mkv'));

      await expect(clean('Folder.mkv')).rejects.toThrow('Only finished video files');
      expect(trashItem).not.toHaveBeenCalled();
    });

    it('a file still in the download queue', async () => {
      jobs.list = [{ state: 'queued', savePath: episodeFile }];

      await expect(clean(EPISODE)).rejects.toThrow('still in the download queue');
      expect(trashItem).not.toHaveBeenCalled();
    });

    it('a queued file written in other capitals on Windows, where that is the same file', async () => {
      const realPlatform = process.platform;

      Object.defineProperty(process, 'platform', { value: 'win32' });
      jobs.list = [{ state: 'queued', savePath: episodeFile.toUpperCase() }];

      await expect(clean(EPISODE)).rejects.toThrow('still in the download queue');
      Object.defineProperty(process, 'platform', { value: realPlatform });
    });

    it('an unknown action, even one named like a built-in property', async () => {
      await expect(clean(EPISODE, 'constructor')).rejects.toThrow('Unknown cleanup action');
      expect(fs.existsSync(episodeFile)).toBe(true);
    });
  });

  describe('on Linux, where capitals make a different file', () => {
    const realPlatform = process.platform;

    beforeEach(() => Object.defineProperty(process, 'platform', { value: 'linux' }));
    afterEach(() => Object.defineProperty(process, 'platform', { value: realPlatform }));

    it('does not mistake another file for the queued one', async () => {
      jobs.list = [{ state: 'queued', savePath: episodeFile.toUpperCase() }];

      await expect(clean(EPISODE)).resolves.toEqual({ bytes: EPISODE_CONTENT.length });
    });

    it('calls it the Trash when it fails', async () => {
      trashItem.mockRejectedValue(new Error('gio failed'));

      await expect(clean(EPISODE)).rejects.toThrow('It couldn’t go to the Trash');
    });
  });

  describe('Recycle Bin', () => {
    it('sends the file there and reports its size', async () => {
      await expect(clean(EPISODE)).resolves.toEqual({ bytes: EPISODE_CONTENT.length });
      expect(trashItem).toHaveBeenCalledExactlyOnceWith(episodeFile);
    });

    it('allows a file whose download job already finished', async () => {
      jobs.list = [{ state: 'completed', savePath: episodeFile }];

      await expect(clean(EPISODE)).resolves.toEqual({ bytes: EPISODE_CONTENT.length });
    });

    it('treats a file that is already gone as done', async () => {
      fs.rmSync(episodeFile);

      await expect(clean(EPISODE)).resolves.toEqual({ bytes: 0 });
      expect(trashItem).not.toHaveBeenCalled();
    });

    it('explains a failure and keeps the file', async () => {
      trashItem.mockRejectedValue(new Error('Failed to move item to trash'));

      await expect(clean(EPISODE)).rejects.toThrow('Nothing was deleted');
      expect(fs.existsSync(episodeFile)).toBe(true);
    });
  });

  describe('moving to a folder', () => {
    const movedFile = () => path.join(settings.cleanupMoveFolder, EPISODE);

    it('moves the file and keeps its show folder', async () => {
      await expect(clean(EPISODE, 'move')).resolves.toEqual({ bytes: EPISODE_CONTENT.length });

      expect(fs.existsSync(episodeFile)).toBe(false);
      expect(fs.readFileSync(movedFile(), 'utf8')).toBe(EPISODE_CONTENT);
    });

    it('never overwrites a file already there', async () => {
      writeFile(movedFile(), 'older copy');

      await expect(clean(EPISODE, 'move')).rejects.toThrow('already a file with this name');

      expect(fs.readFileSync(movedFile(), 'utf8')).toBe('older copy');
      expect(fs.readFileSync(episodeFile, 'utf8')).toBe(EPISODE_CONTENT);
    });

    it('asks for a folder when none was chosen', async () => {
      settings.cleanupMoveFolder = null;

      await expect(clean(EPISODE, 'move')).rejects.toThrow('Choose a folder');
      expect(fs.existsSync(episodeFile)).toBe(true);
    });

    it('refuses a folder inside the download folder, where the file would be found again', async () => {
      settings.cleanupMoveFolder = inDownloads('Archive');
      fs.mkdirSync(settings.cleanupMoveFolder);

      await expect(clean(EPISODE, 'move')).rejects.toThrow('outside your download folder');
      expect(fs.existsSync(episodeFile)).toBe(true);
    });

    it('refuses the download folder itself', async () => {
      settings.cleanupMoveFolder = settings.downloadDir;

      await expect(clean(EPISODE, 'move')).rejects.toThrow('outside your download folder');
    });

    it('reports a move folder on a drive that is gone, rather than creating it', async () => {
      settings.cleanupMoveFolder = path.join(testFolder, 'unplugged', 'Archive');

      await expect(clean(EPISODE, 'move')).rejects.toThrow('can’t be reached');

      expect(fs.existsSync(settings.cleanupMoveFolder)).toBe(false);
      expect(fs.existsSync(episodeFile)).toBe(true);
    });

    it('says when another app has the file open', async () => {
      vi.spyOn(fs.promises, 'rename').mockRejectedValue(Object.assign(new Error('busy'), { code: 'EBUSY' }));

      await expect(clean(EPISODE, 'move')).rejects.toThrow('open in another app');
      expect(fs.existsSync(episodeFile)).toBe(true);
    });
  });

  describe('moving to another drive', () => {
    const movedFile = () => path.join(settings.cleanupMoveFolder, EPISODE);

    const failFirstRenameAcrossDrives = () => {
      const rename = fs.promises.rename;

      vi.spyOn(fs.promises, 'rename').mockImplementation((fromPath, toPath) =>
        fromPath === episodeFile
          ? Promise.reject(Object.assign(new Error('cross-device'), { code: 'EXDEV' }))
          : rename(fromPath, toPath),
      );
    };

    it('copies the file, then removes the original', async () => {
      failFirstRenameAcrossDrives();

      await expect(clean(EPISODE, 'move')).resolves.toEqual({ bytes: EPISODE_CONTENT.length });

      expect(fs.existsSync(episodeFile)).toBe(false);
      expect(fs.readFileSync(movedFile(), 'utf8')).toBe(EPISODE_CONTENT);
      expect(fs.readdirSync(path.dirname(movedFile()))).toEqual([path.basename(movedFile())]);
    });

    it('keeps the original and leaves nothing behind when the copy is incomplete', async () => {
      failFirstRenameAcrossDrives();

      vi.spyOn(fs.promises, 'copyFile').mockImplementation(async (_fromPath, toPath) =>
        fs.writeFileSync(toPath, 'cut'),
      );

      await expect(clean(EPISODE, 'move')).rejects.toThrow('different size');

      expect(fs.readFileSync(episodeFile, 'utf8')).toBe(EPISODE_CONTENT);
      expect(fs.readdirSync(path.dirname(movedFile()))).toEqual([]);
    });
  });

  describe('choosing the move folder', () => {
    it('saves a folder outside the download folder', async () => {
      const chosenFolder = path.join(testFolder, 'Elsewhere');

      showOpenDialog.mockResolvedValue({ canceled: false, filePaths: [chosenFolder] });

      await invoke('cleanup:choose-move-folder');
      expect(saveCleanupMoveFolder).toHaveBeenCalledExactlyOnceWith(chosenFolder);
    });

    it('refuses a folder inside the download folder', async () => {
      showOpenDialog.mockResolvedValue({ canceled: false, filePaths: [inDownloads('Show')] });

      await expect(invoke('cleanup:choose-move-folder')).rejects.toThrow('outside your download folder');
      expect(saveCleanupMoveFolder).not.toHaveBeenCalled();
    });

    it('changes nothing when the dialog is cancelled', async () => {
      showOpenDialog.mockResolvedValue({ canceled: true, filePaths: [] });

      await invoke('cleanup:choose-move-folder');
      expect(saveCleanupMoveFolder).not.toHaveBeenCalled();
    });
  });

  describe('usage', () => {
    it('adds up the folder and reports free space', async () => {
      writeFile(inDownloads(path.join('Other', 'Other - 01.mkv')));

      const usage = await invoke('cleanup:usage');

      expect(usage).toMatchObject({ root: settings.downloadDir, bytes: EPISODE_CONTENT.length * 2, files: 2 });
      expect(usage.freeBytes).toBeGreaterThan(0);
      expect(usage.totalBytes).toBeGreaterThanOrEqual(usage.freeBytes);
    });

    it('leaves free space out when the folder can’t be reached', async () => {
      settings.downloadDir = path.join(testFolder, 'unplugged');

      await expect(invoke('cleanup:usage')).resolves.toMatchObject({ bytes: 0, files: 0, freeBytes: null });
    });

    it('reads the sizes of files, and zero for a file that is gone', async () => {
      await expect(invoke('cleanup:file-sizes', [EPISODE, 'gone.mkv'])).resolves.toEqual({
        [EPISODE]: EPISODE_CONTENT.length,
        'gone.mkv': 0,
      });
    });

    it('refuses to read sizes outside the download folder', async () => {
      await expect(invoke('cleanup:file-sizes', [path.join('..', 'Archive')])).rejects.toThrow(
        'Not in the download folder',
      );
    });
  });
});
