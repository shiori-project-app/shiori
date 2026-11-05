import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const TRAY_WATCHER_NAME = 'org.kde.StatusNotifierWatcher';
const TRAY_CHECK_TIMEOUT_MS = 1000;
const LINUX_PATH_DELIMITER = ':';
const VARIABLES_THE_APP_IMAGE_CHANGES = ['PATH', 'LD_LIBRARY_PATH', 'XDG_DATA_DIRS', 'GSETTINGS_SCHEMA_DIR'];
const EXTRACT_AND_RUN_ARGUMENT = '--appimage-extract-and-run';
const EXTRACTED_APP_IMAGE_FOLDER_START = 'appimage_extracted_';
const RESTART_SHELL = 'bash';

const START_CLEANLY_WHEN_STDIN_CLOSES = `
  for descriptor in /proc/$$/fd/*; do
    descriptor=\${descriptor##*/}
    if ((descriptor > 2)); then eval "exec $descriptor>&-"; fi
  done

  read -r _
  exec "$@" </dev/null
`;

const TRAY_WATCHER_QUERIES = [
  [
    'dbus-send',

    [
      '--session',
      '--print-reply',
      '--dest=org.freedesktop.DBus',
      '/org/freedesktop/DBus',
      'org.freedesktop.DBus.NameHasOwner',
      `string:${TRAY_WATCHER_NAME}`,
    ],
  ],

  [
    'gdbus',

    [
      'call',
      '--session',
      '--dest',
      'org.freedesktop.DBus',
      '--object-path',
      '/org/freedesktop/DBus',
      '--method',
      'org.freedesktop.DBus.NameHasOwner',
      TRAY_WATCHER_NAME,
    ],
  ],
];

let desktopTrayAnswer = null;

export const isLinux = () => process.platform === 'linux';

const realFolder = (folder) => {
  try {
    return fs.realpathSync(folder);
  } catch {
    return null;
  }
};

const startedFromAppImage = () =>
  Boolean(process.env.APPIMAGE && process.env.APPDIR) &&
  realFolder(path.dirname(process.execPath)) === realFolder(process.env.APPDIR);

const appImagePath = () => (startedFromAppImage() ? process.env.APPIMAGE : null);

const installedProgram = () => appImagePath() ?? process.execPath;

const programArguments = () =>
  startedFromAppImage() && path.basename(process.env.APPDIR).startsWith(EXTRACTED_APP_IMAGE_FOLDER_START)
    ? [EXTRACT_AND_RUN_ARGUMENT]
    : [];

const quotedExecArgument = (value) => `"${value.replace(/["`$\\]/g, '\\$&').replace(/%/g, '%%')}"`;

const escapedDesktopString = (value) => value.replace(/\\/g, '\\\\');

export const desktopEntryProgramLines = (...extraArguments) => {
  const command = [quotedExecArgument(installedProgram()), ...programArguments(), ...extraArguments].join(' ');

  return [`TryExec=${escapedDesktopString(installedProgram())}`, `Exec=${escapedDesktopString(command)}`];
};

const withoutFoldersInside = (value, appFolder) =>
  value
    .split(LINUX_PATH_DELIMITER)
    .filter((folder) => !folder.startsWith(appFolder))
    .join(LINUX_PATH_DELIMITER);

export const environmentOutsideApp = () => {
  const appFolder = process.env.APPDIR;

  if (!appFolder) return process.env;

  const restoredVariables = VARIABLES_THE_APP_IMAGE_CHANGES.filter((name) => process.env[name]).map((name) => [
    name,
    withoutFoldersInside(process.env[name], appFolder),
  ]);

  return { ...process.env, ...Object.fromEntries(restoredVariables) };
};

const answersTrue = ([command, args]) => {
  const { stdout } = spawnSync(command, args, {
    encoding: 'utf8',
    timeout: TRAY_CHECK_TIMEOUT_MS,
    env: environmentOutsideApp(),
  });

  return /\btrue\b/.test(stdout ?? '');
};

const isWaylandSession = () => process.env.XDG_SESSION_TYPE === 'wayland' || Boolean(process.env.WAYLAND_DISPLAY);

const isGnomeDesktop = () => /gnome/i.test(process.env.XDG_CURRENT_DESKTOP ?? '');

const canHaveClassicTray = () => !isWaylandSession() && !isGnomeDesktop();

export const desktopHasTray = () => {
  if (!isLinux()) return true;

  desktopTrayAnswer ??= TRAY_WATCHER_QUERIES.some(answersTrue) || canHaveClassicTray();

  return desktopTrayAnswer;
};

export const startAgainAfterExit = (restartArguments) =>
  new Promise((resolve, reject) => {
    const program = installedProgram();

    fs.accessSync(program, fs.constants.X_OK);

    const remainingArguments = restartArguments.filter((argument) => argument !== EXTRACT_AND_RUN_ARGUMENT);

    const shell = spawn(
      RESTART_SHELL,
      ['-c', START_CLEANLY_WHEN_STDIN_CLOSES, 'shiori', program, ...programArguments(), ...remainingArguments],
      { detached: true, stdio: ['pipe', 'ignore', 'ignore'], env: environmentOutsideApp() },
    );

    shell.once('error', reject);

    shell.once('spawn', () => {
      shell.unref();
      resolve();
    });
  });
