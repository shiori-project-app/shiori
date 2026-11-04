import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import { APP_ICON_FILE } from './appIcon.js';
import { writeFileAtomically } from './fileSystem.js';
import { desktopEntryProgramLines, isLinux } from './linuxDesktop.js';
import { logError } from './logger.js';

const ENTRY_FILE_NAME = 'shiori.desktop';
const ICON_NAME = 'shiori';
const MANAGED_BY_SHIORI_LINE = 'X-Shiori-Managed=true';
const SYSTEM_ENTRY_FILE = path.posix.join('/usr/share/applications', ENTRY_FILE_NAME);

const dataFolder = () => {
  const configuredFolder = process.env.XDG_DATA_HOME;

  return configuredFolder && path.isAbsolute(configuredFolder)
    ? configuredFolder
    : path.join(app.getPath('home'), '.local', 'share');
};

const userEntryFile = () => path.join(dataFolder(), 'applications', ENTRY_FILE_NAME);

const userIconFile = () => path.join(dataFolder(), 'icons', 'hicolor', '512x512', 'apps', `${ICON_NAME}.png`);

const launcherEntry = () =>
  [
    '[Desktop Entry]',
    'Type=Application',
    'Name=Shiori',
    'Comment=Shiori — anime desktop app',
    ...desktopEntryProgramLines(),
    `Icon=${ICON_NAME}`,
    `StartupWMClass=${ICON_NAME}`,
    'Terminal=false',
    'Categories=AudioVideo;Video;',
    MANAGED_BY_SHIORI_LINE,
    '',
  ].join('\n');

const readFileIfPresent = (filePath) => {
  try {
    return fs.readFileSync(filePath);
  } catch {
    return null;
  }
};

const writeWhenChanged = (filePath, contents) => {
  if (!readFileIfPresent(filePath)?.equals(contents)) writeFileAtomically(filePath, contents);
};

const writeUserEntry = () => {
  writeWhenChanged(userIconFile(), fs.readFileSync(APP_ICON_FILE));
  writeWhenChanged(userEntryFile(), Buffer.from(launcherEntry()));
};

const removeUserEntry = () => {
  fs.rmSync(userEntryFile(), { force: true });
  fs.rmSync(userIconFile(), { force: true });
};

const syncUserEntry = () => {
  const savedEntry = readFileIfPresent(userEntryFile());

  if (savedEntry && !savedEntry.includes(MANAGED_BY_SHIORI_LINE)) return;
  if (!fs.existsSync(SYSTEM_ENTRY_FILE)) writeUserEntry();
  else if (savedEntry) removeUserEntry();
};

export const refreshLauncherEntry = () => {
  if (!isLinux() || !app.isPackaged) return;

  try {
    syncUserEntry();
  } catch (error) {
    logError('The launcher entry could not be updated', error);
  }
};
