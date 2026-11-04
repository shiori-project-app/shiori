import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ipcMain, shell } from 'electron';
import { environmentOutsideApp, isLinux } from '../linuxDesktop.js';
import { showFolder } from './paths.js';

const QBITTORRENT_NAME = 'qBittorrent';
const QBITTORRENT_FLATPAK_LAUNCHER = 'org.qbittorrent.qBittorrent';
const LINUX_PATH_DELIMITER = ':';
const MAGNET_LINK = /^magnet:\?xt=urn:btih:[a-z0-9]{32,40}/i;

const windowsInstallPaths = () =>
  [
    process.env.ProgramFiles && path.join(process.env.ProgramFiles, 'qBittorrent', 'qbittorrent.exe'),
    process.env['ProgramFiles(x86)'] && path.join(process.env['ProgramFiles(x86)'], 'qBittorrent', 'qbittorrent.exe'),
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Programs', 'qBittorrent', 'qbittorrent.exe'),
  ].filter(Boolean);

const linuxInstallPaths = () => [
  ...(environmentOutsideApp().PATH ?? '')
    .split(LINUX_PATH_DELIMITER)
    .filter(Boolean)
    .map((folder) => path.posix.join(folder, 'qbittorrent')),

  path.posix.join('/var/lib/flatpak/exports/bin', QBITTORRENT_FLATPAK_LAUNCHER),
  path.posix.join(os.homedir(), '.local/share/flatpak/exports/bin', QBITTORRENT_FLATPAK_LAUNCHER),
];

const isRunnable = (filePath) => {
  try {
    fs.accessSync(filePath, fs.constants.X_OK);

    return true;
  } catch {
    return false;
  }
};

const findQbittorrent = () => (isLinux() ? linuxInstallPaths() : windowsInstallPaths()).find(isRunnable);

const isMagnetLink = (value) => typeof value === 'string' && MAGNET_LINK.test(value);

const launchDetached = (executable, args) =>
  new Promise((resolve, reject) => {
    const childProcess = spawn(executable, args, { detached: true, stdio: 'ignore', env: environmentOutsideApp() });

    childProcess.once('error', reject);

    childProcess.once('spawn', () => {
      childProcess.unref();
      resolve();
    });
  });

const openInQbittorrent = async (qbittorrentPath, magnet, folder) => {
  const savePath = showFolder(folder);

  fs.mkdirSync(savePath, { recursive: true });
  await launchDetached(qbittorrentPath, [`--save-path=${savePath}`, '--skip-dialog=true', magnet]);

  return { app: QBITTORRENT_NAME, savePath };
};

const openMagnet = async (_event, { magnet, folder }) => {
  if (!isMagnetLink(magnet)) throw new Error('Invalid magnet link');

  const qbittorrentPath = findQbittorrent();

  if (qbittorrentPath) return openInQbittorrent(qbittorrentPath, magnet, folder);

  await shell.openExternal(magnet);

  return { app: null, savePath: null };
};

export const registerTorrentHandlers = () => {
  ipcMain.handle('torrent:app', () => (findQbittorrent() ? QBITTORRENT_NAME : null));
  ipcMain.handle('torrent:open', openMagnet);
};
