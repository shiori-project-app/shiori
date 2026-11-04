import fs from 'node:fs';
import path from 'node:path';
import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import { writeFileAtomicallyAsync } from '../fileSystem.js';

const EXPORT_FILE_TYPES = {
  backup: { title: 'Save Shiori backup', filters: [{ name: 'Shiori backup', extensions: ['json'] }] },
  mal: { title: 'Export list for MyAnimeList / AniList', filters: [{ name: 'MyAnimeList XML', extensions: ['xml'] }] },
};

const MAX_BACKUP_BYTES = 50 * 1024 * 1024;
const AUTO_BACKUPS_KEPT = 10;
const AUTO_BACKUP_PREFIX = 'before-restore-';

const autoBackupFolder = () => path.join(app.getPath('userData'), 'backups');

const fileTimestamp = () => new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');

const ownerWindow = (event) => BrowserWindow.fromWebContents(event.sender);

const saveExport = async (event, { kind, fileName, content }) => {
  const fileType = EXPORT_FILE_TYPES[kind];

  if (!fileType || typeof content !== 'string') throw new Error('Unknown export.');

  const { canceled, filePath } = await dialog.showSaveDialog(ownerWindow(event), {
    title: fileType.title,
    defaultPath: path.join(app.getPath('documents'), path.basename(String(fileName))),
    filters: fileType.filters,
  });

  if (canceled || !filePath) return null;

  await writeFileAtomicallyAsync(filePath, content);

  return filePath;
};

const openBackup = async (event) => {
  const { canceled, filePaths } = await dialog.showOpenDialog(ownerWindow(event), {
    title: 'Restore Shiori backup',
    defaultPath: app.getPath('documents'),
    filters: EXPORT_FILE_TYPES.backup.filters,
    properties: ['openFile'],
  });

  const [chosenFile] = filePaths;

  if (canceled || !chosenFile) return null;

  const { size } = await fs.promises.stat(chosenFile);

  if (size > MAX_BACKUP_BYTES) throw new Error('This file is too large to be a Shiori backup.');

  return { path: chosenFile, text: await fs.promises.readFile(chosenFile, 'utf8') };
};

const removeOldAutoBackups = async (backupFolder) => {
  const autoBackupNames = (await fs.promises.readdir(backupFolder))
    .filter((fileName) => fileName.startsWith(AUTO_BACKUP_PREFIX))
    .sort()
    .reverse();

  await Promise.all(
    autoBackupNames
      .slice(AUTO_BACKUPS_KEPT)
      .map((fileName) => fs.promises.rm(path.join(backupFolder, fileName), { force: true })),
  );
};

const autoBackup = async (_event, content) => {
  if (typeof content !== 'string') throw new Error('Nothing to back up.');

  const backupFolder = autoBackupFolder();

  await fs.promises.mkdir(backupFolder, { recursive: true });

  const backupFile = path.join(backupFolder, `${AUTO_BACKUP_PREFIX}${fileTimestamp()}.json`);

  await writeFileAtomicallyAsync(backupFile, content);
  await removeOldAutoBackups(backupFolder);

  return backupFile;
};

export const registerBackupHandlers = () => {
  ipcMain.handle('backup:save', saveExport);
  ipcMain.handle('backup:open', openBackup);
  ipcMain.handle('backup:auto', autoBackup);
};
