import { spawnSync } from 'node:child_process';

const TRAY_WATCHER_NAME = 'org.kde.StatusNotifierWatcher';
const TRAY_CHECK_TIMEOUT_MS = 1000;
const LINUX_PATH_DELIMITER = ':';
const VARIABLES_THE_APP_IMAGE_CHANGES = ['PATH', 'LD_LIBRARY_PATH', 'XDG_DATA_DIRS', 'GSETTINGS_SCHEMA_DIR'];

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

export const appImagePath = () => process.env.APPIMAGE || null;

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

export const relaunchOptions = () => {
  const appImage = appImagePath();

  return appImage ? { execPath: appImage, args: process.argv.slice(1) } : {};
};
