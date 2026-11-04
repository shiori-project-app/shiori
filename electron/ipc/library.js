import fs from 'node:fs';
import path from 'node:path';
import { ipcMain, shell } from 'electron';
import { isVideoFileName } from '../../shared/videoFiles.js';
import { downloadsRoot, resolveDownloadPath } from './paths.js';
import { isAppDownloadFolder } from './settings.js';

const QBITTORRENT_INCOMPLETE_SUFFIX = /\.!qB$/i;
const MAX_FOLDER_DEPTH = 4;

const readFolderEntries = (folder) => fs.promises.readdir(folder, { withFileTypes: true }).catch(() => []);

const toVideoFile = (entry, relativePath, relativeFolder) => {
  const name = entry.name.replace(QBITTORRENT_INCOMPLETE_SUFFIX, '');

  if (!isVideoFileName(name)) return null;

  return {
    path: relativePath,
    name,
    folder: relativeFolder ? relativeFolder.split(path.sep)[0] : '',
    inProgress: name !== entry.name,
  };
};

const findVideoFiles = async (folder, relativeFolder, depth) => {
  const entries = await readFolderEntries(folder);

  const filesPerEntry = await Promise.all(
    entries.map(async (entry) => {
      const relativePath = relativeFolder ? path.join(relativeFolder, entry.name) : entry.name;

      if (entry.isDirectory()) {
        return depth < MAX_FOLDER_DEPTH ? findVideoFiles(path.join(folder, entry.name), relativePath, depth + 1) : [];
      }

      const videoFile = toVideoFile(entry, relativePath, relativeFolder);

      return videoFile ? [videoFile] : [];
    }),
  );

  return filesPerEntry.flat();
};

const canReadFolder = (folder) =>
  fs.promises.readdir(folder).then(
    () => true,
    () => false,
  );

const isReachable = async (rootFolder) => (await canReadFolder(rootFolder)) || isAppDownloadFolder(rootFolder);

export const scanLibrary = async () => {
  const rootFolder = downloadsRoot();
  const unreachableScan = { root: rootFolder, files: [], isUnreachable: true };

  if (!(await isReachable(rootFolder))) return unreachableScan;

  const files = await findVideoFiles(rootFolder, '', 0);

  return (await isReachable(rootFolder)) ? { root: rootFolder, files, isUnreachable: false } : unreachableScan;
};

export const registerLibraryHandlers = () => {
  ipcMain.handle('library:scan', scanLibrary);
  ipcMain.handle('library:show', (_event, relativePath) => shell.showItemInFolder(resolveDownloadPath(relativePath)));
};
