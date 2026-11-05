import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import { writeFileAtomically } from './fileSystem.js';
import { desktopEntryProgramLines, isLinux } from './linuxDesktop.js';
import { logError } from './logger.js';

export const START_IN_TRAY_ARGUMENT = '--start-in-tray';
const AUTOSTART_FILE_NAME = 'shiori.desktop';

const electronLoginItem = () => ({ path: process.execPath, args: [START_IN_TRAY_ARGUMENT] });

const autostartFile = () => path.join(app.getPath('appData'), 'autostart', AUTOSTART_FILE_NAME);

const autostartEntry = () =>
  [
    '[Desktop Entry]',
    'Type=Application',
    'Name=Shiori',
    ...desktopEntryProgramLines(START_IN_TRAY_ARGUMENT),
    'Terminal=false',
    'X-GNOME-Autostart-enabled=true',
    '',
  ].join('\n');

const readAutostartEntry = () => {
  try {
    return fs.readFileSync(autostartFile(), 'utf8');
  } catch {
    return null;
  }
};

const writeAutostartEntry = () => {
  fs.mkdirSync(path.dirname(autostartFile()), { recursive: true });
  writeFileAtomically(autostartFile(), autostartEntry());
};

const setAutostartEntry = (shouldOpenAtLogin) => {
  try {
    if (shouldOpenAtLogin) writeAutostartEntry();
    else fs.rmSync(autostartFile(), { force: true });
  } catch (error) {
    logError('The autostart entry could not be changed', error);
  }
};

export const canOpenAtLogin = () => app.isPackaged;

export const opensAtLogin = () => {
  if (!canOpenAtLogin()) return false;

  return isLinux() ? readAutostartEntry() !== null : app.getLoginItemSettings(electronLoginItem()).openAtLogin;
};

export const setOpensAtLogin = (shouldOpenAtLogin) => {
  if (!canOpenAtLogin()) return;

  if (isLinux()) setAutostartEntry(shouldOpenAtLogin);
  else app.setLoginItemSettings({ ...electronLoginItem(), openAtLogin: shouldOpenAtLogin });
};

export const refreshLoginItem = () => {
  if (!canOpenAtLogin() || !isLinux()) return;

  const savedEntry = readAutostartEntry();

  if (savedEntry !== null && savedEntry !== autostartEntry()) setAutostartEntry(true);
};
