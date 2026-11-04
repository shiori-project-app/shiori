import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const spawnSync = vi.hoisted(() => vi.fn());

vi.mock('node:child_process', () => ({ spawnSync, default: { spawnSync } }));

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

  describe('relaunchOptions', () => {
    it('restarts the AppImage file, because its running copy disappears on quit', async () => {
      useDesktop({ APPIMAGE: '/home/me/Shiori.AppImage' });

      const { relaunchOptions } = await loadDesktop();

      expect(relaunchOptions()).toEqual({ execPath: '/home/me/Shiori.AppImage', args: process.argv.slice(1) });
    });

    it('uses the normal restart otherwise', async () => {
      const { relaunchOptions } = await loadDesktop();

      expect(relaunchOptions()).toEqual({});
    });
  });
});
