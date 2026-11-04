import fs from 'node:fs';
import path from 'node:path';
import { BrowserWindow, dialog, ipcMain, shell } from 'electron';
import { isPending } from '../../shared/downloadStates.js';
import { trashNameOn } from '../../shared/platformNames.js';
import { isVideoFileName } from '../../shared/videoFiles.js';
import { allJobs } from '../downloads/queueStore.js';
import { folderUsage } from '../fileSystem.js';
import { isLinux } from '../linuxDesktop.js';
import { logError } from '../logger.js';
import { downloadsRoot, isInsideFolder, resolveDownloadPath } from './paths.js';
import { getSettings, saveCleanupMoveFolder, settingsForPage } from './settings.js';

const LOCKED_FILE_ERROR_CODES = ['EBUSY', 'EPERM', 'EACCES'];
const MOVE_IN_PROGRESS_SUFFIX = '.shiori-moving';

const LOCKED_FILE_MESSAGE = 'It’s open in another app, such as a video player or qBittorrent.';

const trashFailureMessage = () => {
  const trashName = trashNameOn(process.platform);

  return `It couldn’t go to the ${trashName}. It may be open in another app, or this drive may not have a ${trashName}. Nothing was deleted.`;
};

const comparablePath = (filePath) => (isLinux() ? path.resolve(filePath) : path.resolve(filePath).toLowerCase());

const samePath = (firstPath, secondPath) => comparablePath(firstPath) === comparablePath(secondPath);

const pathExists = (target) =>
  fs.promises.access(target).then(
    () => true,
    () => false,
  );

const readDiskSpace = async (folder) => {
  const disk = await fs.promises.statfs(folder).catch(() => null);

  return disk
    ? { freeBytes: disk.bavail * disk.bsize, totalBytes: disk.blocks * disk.bsize }
    : { freeBytes: null, totalBytes: null };
};

const downloadFolderUsage = async () => {
  const root = downloadsRoot();
  const [usage, diskSpace] = await Promise.all([folderUsage(root), readDiskSpace(root)]);

  return { root, ...usage, ...diskSpace };
};

const fileSizes = async (_event, relativePaths) =>
  Object.fromEntries(
    await Promise.all(
      relativePaths.map(async (relativePath) => {
        const stats = await fs.promises.stat(resolveDownloadPath(relativePath)).catch(() => null);

        return [relativePath, stats?.size ?? 0];
      }),
    ),
  );

const assertOutsideDownloadFolder = (folder) => {
  const root = downloadsRoot();

  if (samePath(root, folder) || isInsideFolder(path.resolve(root), path.resolve(folder))) {
    throw new Error('Choose a folder outside your download folder, or Shiori would keep finding these episodes.');
  }
};

const chooseCleanupMoveFolder = async (event) => {
  const { canceled, filePaths } = await dialog.showOpenDialog(BrowserWindow.fromWebContents(event.sender), {
    title: 'Choose where watched episodes go',
    defaultPath: getSettings().cleanupMoveFolder ?? undefined,
    properties: ['openDirectory', 'createDirectory'],
  });

  if (canceled) return settingsForPage(getSettings());

  assertOutsideDownloadFolder(filePaths[0]);

  return saveCleanupMoveFolder(filePaths[0]);
};

const usableMoveFolder = async () => {
  const folder = getSettings().cleanupMoveFolder;

  if (!folder) throw new Error('Choose a folder to move watched episodes to first.');

  assertOutsideDownloadFolder(folder);

  if (!(await pathExists(folder))) throw new Error(`The folder ${folder} can’t be reached. Is the drive connected?`);

  return folder;
};

const removeLeftoverCopy = (copyPath) => fs.promises.rm(copyPath, { force: true }).catch(() => {});

const moveAcrossDrives = async (fromPath, toPath) => {
  const copyPath = `${toPath}${MOVE_IN_PROGRESS_SUFFIX}`;

  try {
    await fs.promises.copyFile(fromPath, copyPath);

    const [original, copy] = await Promise.all([fs.promises.stat(fromPath), fs.promises.stat(copyPath)]);

    if (original.size !== copy.size) throw new Error('The copy came out a different size, so the original was kept.');

    await fs.promises.rename(copyPath, toPath);
  } catch (error) {
    await removeLeftoverCopy(copyPath);

    throw error;
  }

  await fs.promises.rm(fromPath);
};

const moveWithoutOverwriting = async (fromPath, toPath) => {
  await fs.promises.mkdir(path.dirname(toPath), { recursive: true });

  if (await pathExists(toPath)) {
    throw new Error(`There’s already a file with this name in ${path.dirname(toPath)}.`);
  }

  try {
    await fs.promises.rename(fromPath, toPath);
  } catch (error) {
    if (error.code !== 'EXDEV') throw error;

    await moveAcrossDrives(fromPath, toPath);
  }
};

const moveToFolder = async (filePath, relativePath) => {
  const folder = await usableMoveFolder();

  await moveWithoutOverwriting(filePath, path.join(folder, relativePath));
};

const moveToTrash = async (filePath) => {
  try {
    await shell.trashItem(filePath);
  } catch (error) {
    logError(`Could not send ${filePath} to the ${trashNameOn(process.platform)}`, error);

    throw new Error(trashFailureMessage());
  }
};

const CLEANUP_PERFORMERS = { trash: moveToTrash, move: moveToFolder };

const assertCleanableEpisodeFile = (relativePath) => {
  const filePath = resolveDownloadPath(relativePath);

  if (!isVideoFileName(path.basename(filePath))) throw new Error('Only finished video files can be cleaned up.');

  if (allJobs().some((job) => isPending(job) && samePath(job.savePath, filePath))) {
    throw new Error('This file is still in the download queue.');
  }

  return filePath;
};

const readableCleanupFailure = (error) =>
  LOCKED_FILE_ERROR_CODES.includes(error.code) ? new Error(LOCKED_FILE_MESSAGE) : error;

const cleanUpFile = async (_event, { relativePath, action }) => {
  if (!Object.hasOwn(CLEANUP_PERFORMERS, action)) throw new Error(`Unknown cleanup action: ${action}`);

  const filePath = assertCleanableEpisodeFile(relativePath);
  const stats = await fs.promises.lstat(filePath).catch(() => null);

  if (!stats) return { bytes: 0 };
  if (!stats.isFile()) throw new Error('Only finished video files can be cleaned up.');

  try {
    await CLEANUP_PERFORMERS[action](filePath, relativePath);
  } catch (error) {
    logError(`Could not clean up ${filePath}`, error);

    throw readableCleanupFailure(error);
  }

  return { bytes: stats.size };
};

export const registerCleanupHandlers = () => {
  ipcMain.handle('cleanup:usage', downloadFolderUsage);
  ipcMain.handle('cleanup:file-sizes', fileSizes);
  ipcMain.handle('cleanup:choose-move-folder', chooseCleanupMoveFolder);
  ipcMain.handle('cleanup:clean-file', cleanUpFile);
};
