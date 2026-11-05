import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { spawn, spawnSync } = vi.hoisted(() => ({ spawn: vi.fn(), spawnSync: vi.fn() }));

vi.mock('node:child_process', () => ({ spawn, spawnSync, default: { spawn, spawnSync } }));

const realPlatform = process.platform;
const realEnvironment = process.env;
const DESKTOP_VARIABLES = ['XDG_SESSION_TYPE', 'WAYLAND_DISPLAY', 'XDG_CURRENT_DESKTOP', 'APPDIR', 'APPIMAGE'];

const loadDesktop = async () => {
  vi.resetModules();

  return import('../../electron/linuxDesktop.js');
};

const answerTrayWatcherWith = (output) => spawnSync.mockReturnValue({ stdout: output });

const useDesktop = (variables) => {
  process.env = { ...process.env, ...variables };
};

describe('linuxDesktop', () => {
  beforeEach(() => {
    Object.defineProperty(process, 'platform', { value: 'linux' });
    process.env = { ...realEnvironment };
    DESKTOP_VARIABLES.forEach((name) => delete process.env[name]);
    spawn.mockReset();
    spawnSync.mockReset();
    answerTrayWatcherWith('   boolean false\n');
  });

  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: realPlatform });
    process.env = realEnvironment;
  });

  describe('desktopHasTray', () => {
    it('never asks on Windows, where the tray always exists', async () => {
      Object.defineProperty(process, 'platform', { value: 'win32' });

      const { desktopHasTray } = await loadDesktop();

      expect(desktopHasTray()).toBe(true);
      expect(spawnSync).not.toHaveBeenCalled();
    });

    it.each([
      ['dbus-send', '   boolean true\n'],
      ['gdbus', '(true,)\n'],
    ])('trusts a running tray watcher reported by %s, even on GNOME', async (_tool, output) => {
      useDesktop({ XDG_CURRENT_DESKTOP: 'ubuntu:GNOME', XDG_SESSION_TYPE: 'wayland' });

      answerTrayWatcherWith(output);

      const { desktopHasTray } = await loadDesktop();

      expect(desktopHasTray()).toBe(true);
    });

    it.each([
      ['GNOME without the extension', { XDG_CURRENT_DESKTOP: 'GNOME', XDG_SESSION_TYPE: 'x11' }],
      ['a Wayland session', { XDG_CURRENT_DESKTOP: 'sway', WAYLAND_DISPLAY: 'wayland-1' }],
    ])('finds none on %s', async (_name, variables) => {
      useDesktop(variables);

      const { desktopHasTray } = await loadDesktop();

      expect(desktopHasTray()).toBe(false);
    });

    it('assumes a classic tray on other X11 desktops, which have one without a watcher', async () => {
      useDesktop({ XDG_CURRENT_DESKTOP: 'LXDE', XDG_SESSION_TYPE: 'x11' });

      const { desktopHasTray } = await loadDesktop();

      expect(desktopHasTray()).toBe(true);
    });

    it('treats missing tools as no answer, not as a tray', async () => {
      useDesktop({ XDG_CURRENT_DESKTOP: 'GNOME' });

      spawnSync.mockReturnValue({ error: new Error('ENOENT'), stdout: null });

      const { desktopHasTray } = await loadDesktop();

      expect(desktopHasTray()).toBe(false);
    });

    it('asks once, since the page reads it with every settings change', async () => {
      answerTrayWatcherWith('boolean true');

      const { desktopHasTray } = await loadDesktop();

      desktopHasTray();
      desktopHasTray();

      expect(spawnSync).toHaveBeenCalledTimes(1);
    });
  });

  describe('environmentOutsideApp', () => {
    it('removes only the AppImage’s folders, so other programs use their own libraries', async () => {
      useDesktop({
        APPDIR: '/tmp/.mount_Shiori',
        LD_LIBRARY_PATH: '/tmp/.mount_Shiori/usr/lib:/opt/mine/lib',
        PATH: '/tmp/.mount_Shiori:/tmp/.mount_Shiori/usr/sbin:/usr/bin',
      });

      const { environmentOutsideApp } = await loadDesktop();

      expect(environmentOutsideApp()).toMatchObject({ LD_LIBRARY_PATH: '/opt/mine/lib', PATH: '/usr/bin' });
    });

    it('changes nothing outside an AppImage', async () => {
      useDesktop({ LD_LIBRARY_PATH: '/opt/mine/lib' });

      const { environmentOutsideApp } = await loadDesktop();

      expect(environmentOutsideApp().LD_LIBRARY_PATH).toBe('/opt/mine/lib');
    });
  });

  describe('startAgainAfterExit', () => {
    const shellThatEmits = (eventName, detail) => {
      const shell = {
        unref: vi.fn(),
        once: (name, listener) => {
          if (name === eventName) listener(detail);
        },
      };

      spawn.mockReturnValue(shell);

      return shell;
    };

    const startedProgram = () => spawn.mock.calls[0][1].slice(3);

    const appImageFolder = () => path.dirname(process.execPath);

    beforeEach(() => vi.spyOn(fs, 'accessSync').mockImplementation(() => {}));

    afterEach(() => vi.restoreAllMocks());

    it('starts the AppImage file, because its running copy disappears on quit', async () => {
      useDesktop({ APPIMAGE: '/home/me/Shiori.AppImage', APPDIR: appImageFolder() });
      shellThatEmits('spawn');

      const { startAgainAfterExit } = await loadDesktop();

      await startAgainAfterExit(['--wanted']);

      expect(startedProgram()).toEqual(['/home/me/Shiori.AppImage', '--wanted']);
    });

    it('recognises the AppImage when its folder is reached through a symlink, such as a linked temp folder', async () => {
      const testFolder = fs.mkdtempSync(path.join(os.tmpdir(), 'shiori-appdir-'));
      const realAppFolder = path.join(testFolder, 'real');
      const linkedAppFolder = path.join(testFolder, 'link');
      const realExecPath = process.execPath;

      fs.mkdirSync(realAppFolder);
      fs.symlinkSync(realAppFolder, linkedAppFolder, 'junction');
      process.execPath = path.join(realAppFolder, 'shiori');
      useDesktop({ APPIMAGE: '/home/me/Shiori.AppImage', APPDIR: linkedAppFolder });
      shellThatEmits('spawn');

      try {
        const { startAgainAfterExit } = await loadDesktop();

        await startAgainAfterExit([]);

        expect(startedProgram()).toEqual(['/home/me/Shiori.AppImage']);
      } finally {
        process.execPath = realExecPath;
        fs.rmSync(testFolder, { recursive: true, force: true });
      }
    });

    it('ignores an APPIMAGE variable inherited from another AppImage', async () => {
      useDesktop({ APPIMAGE: '/home/me/Editor.AppImage', APPDIR: '/tmp/.mount_Editor' });
      shellThatEmits('spawn');

      const { startAgainAfterExit } = await loadDesktop();

      await startAgainAfterExit([]);

      expect(startedProgram()).toEqual([process.execPath]);
    });

    it('keeps extracting an AppImage that was started on a system without FUSE', async () => {
      useDesktop({ APPIMAGE: '/home/me/Shiori.AppImage', APPDIR: appImageFolder() });
      vi.spyOn(path, 'basename').mockReturnValue('appimage_extracted_abc');
      shellThatEmits('spawn');

      const { startAgainAfterExit } = await loadDesktop();

      await startAgainAfterExit(['--appimage-extract-and-run', '--wanted']);

      expect(startedProgram()).toEqual(['/home/me/Shiori.AppImage', '--appimage-extract-and-run', '--wanted']);
    });

    it('reports a program that has gone, without starting a shell', async () => {
      const failure = new Error('gone');
      const { startAgainAfterExit } = await loadDesktop();

      fs.accessSync.mockImplementation((file) => {
        if (file === process.execPath) throw failure;
      });

      await expect(startAgainAfterExit([])).rejects.toBe(failure);
      expect(spawn).not.toHaveBeenCalled();
    });

    it('starts the running program when there is no AppImage', async () => {
      shellThatEmits('spawn');

      const { startAgainAfterExit } = await loadDesktop();

      await startAgainAfterExit(['--wanted']);

      expect(startedProgram()).toEqual([process.execPath, '--wanted']);
    });

    it('leaves the shell running on its own, waiting on a pipe that closes when Shiori exits', async () => {
      const shell = shellThatEmits('spawn');
      const { startAgainAfterExit } = await loadDesktop();

      await startAgainAfterExit([]);

      expect(spawn.mock.calls[0][2]).toMatchObject({ detached: true, stdio: ['pipe', 'ignore', 'ignore'] });
      expect(shell.unref).toHaveBeenCalled();
    });

    it('reports a shell that could not start', async () => {
      const failure = new Error('no shell');

      shellThatEmits('error', failure);

      const { startAgainAfterExit } = await loadDesktop();

      await expect(startAgainAfterExit([])).rejects.toBe(failure);
    });
  });
});
