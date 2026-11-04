import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const handlers = vi.hoisted(() => new Map());
const spawn = vi.hoisted(() => vi.fn());
const openExternal = vi.hoisted(() => vi.fn());
const fakeFiles = vi.hoisted(() => ({ runnable: [] }));

vi.mock('node:child_process', () => ({ spawn, default: { spawn } }));

vi.mock('electron', () => ({
  ipcMain: { handle: (channel, handler) => handlers.set(channel, handler) },
  shell: { openExternal },
}));

vi.mock('../../electron/ipc/paths.js', () => ({
  showFolder: (title) => path.join(os.tmpdir(), 'shiori-torrents', title),
}));

const { registerTorrentHandlers } = await import('../../electron/ipc/torrents.js');

registerTorrentHandlers();

const MAGNET = `magnet:?xt=urn:btih:${'a'.repeat(40)}`;
const realPlatform = process.platform;
const realEnvironment = process.env;

const torrentApp = () => handlers.get('torrent:app')();

const openMagnet = (magnet = MAGNET) => handlers.get('torrent:open')({}, { magnet, folder: 'Frieren' });

const fakeChildProcess = () => {
  const childProcess = Object.assign(new EventEmitter(), { unref: vi.fn() });

  setImmediate(() => childProcess.emit('spawn'));

  return childProcess;
};

describe('torrent handlers on Linux', () => {
  beforeEach(() => {
    Object.defineProperty(process, 'platform', { value: 'linux' });
    process.env = { ...realEnvironment, PATH: '/usr/local/bin:/usr/bin' };
    fakeFiles.runnable = [];
    spawn.mockReset().mockImplementation(fakeChildProcess);
    openExternal.mockReset().mockResolvedValue(undefined);

    vi.spyOn(fs, 'accessSync').mockImplementation((filePath) => {
      if (!fakeFiles.runnable.includes(filePath)) throw new Error('ENOENT');
    });

    vi.spyOn(fs, 'mkdirSync').mockImplementation(() => {});
  });

  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: realPlatform });
    process.env = realEnvironment;
    vi.restoreAllMocks();
  });

  it('finds qBittorrent on the PATH and hands it the magnet with its save folder', async () => {
    fakeFiles.runnable = ['/usr/bin/qbittorrent'];

    expect(torrentApp()).toBe('qBittorrent');
    await expect(openMagnet()).resolves.toMatchObject({ app: 'qBittorrent' });

    const [executable, args] = spawn.mock.calls[0];

    expect(executable).toBe('/usr/bin/qbittorrent');
    expect(args).toEqual(expect.arrayContaining(['--skip-dialog=true', MAGNET]));
    expect(args[0]).toContain('--save-path=');
    expect(openExternal).not.toHaveBeenCalled();
  });

  it('finds the Flatpak version', () => {
    fakeFiles.runnable = ['/var/lib/flatpak/exports/bin/org.qbittorrent.qBittorrent'];

    expect(torrentApp()).toBe('qBittorrent');
  });

  it('finds a Flatpak installed for this user only', () => {
    fakeFiles.runnable = [
      path.posix.join(os.homedir(), '.local/share/flatpak/exports/bin/org.qbittorrent.qBittorrent'),
    ];

    expect(torrentApp()).toBe('qBittorrent');
  });

  it('starts it without the AppImage’s libraries, which could stop it loading', async () => {
    process.env = {
      ...process.env,
      APPDIR: '/tmp/.mount_Shiori',
      LD_LIBRARY_PATH: '/tmp/.mount_Shiori/usr/lib',
      PATH: '/tmp/.mount_Shiori:/usr/bin',
    };

    fakeFiles.runnable = ['/usr/bin/qbittorrent'];
    await openMagnet();

    expect(spawn.mock.calls[0][2].env).toMatchObject({ LD_LIBRARY_PATH: '', PATH: '/usr/bin' });
  });

  it('never runs a qBittorrent bundled inside the AppImage folder', () => {
    process.env = { ...process.env, APPDIR: '/tmp/.mount_Shiori', PATH: '/tmp/.mount_Shiori:/usr/bin' };
    fakeFiles.runnable = ['/tmp/.mount_Shiori/qbittorrent'];

    expect(torrentApp()).toBeNull();
  });

  it('falls back to the system magnet handler, still never downloading itself', async () => {
    expect(torrentApp()).toBeNull();
    await expect(openMagnet()).resolves.toEqual({ app: null, savePath: null });

    expect(openExternal).toHaveBeenCalledExactlyOnceWith(MAGNET);
    expect(spawn).not.toHaveBeenCalled();
  });

  it('refuses anything that is not a magnet link', async () => {
    await expect(openMagnet('https://example.com/file.torrent')).rejects.toThrow('Invalid magnet link');
    expect(openExternal).not.toHaveBeenCalled();
  });
});
