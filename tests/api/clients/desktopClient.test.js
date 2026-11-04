import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearFinishedDownloads,
  openDownloadDir,
  pauseAllDownloads,
  pauseDownload,
  resumeAllDownloads,
} from '@/api/clients/desktopClient';

const clickEvent = { type: 'click', nativeEvent: {}, currentTarget: {} };

describe('desktop client', () => {
  afterEach(() => delete window.shiori);

  it('never forwards a click event to calls that take no arguments (it can’t cross IPC)', async () => {
    window.shiori = {
      openDownloadDir: vi.fn(async () => {}),
      pauseAllDownloads: vi.fn(async () => {}),
      resumeAllDownloads: vi.fn(async () => {}),
      clearFinishedDownloads: vi.fn(async () => {}),
    };

    await Promise.all(
      [openDownloadDir, pauseAllDownloads, resumeAllDownloads, clearFinishedDownloads].map((call) => call(clickEvent)),
    );

    Object.values(window.shiori).forEach((bridgeCall) => expect(bridgeCall).toHaveBeenCalledWith());
  });

  it('passes arguments through to calls that need them', async () => {
    window.shiori = { pauseDownload: vi.fn(async () => {}) };
    await pauseDownload('job-1');
    expect(window.shiori.pauseDownload).toHaveBeenCalledWith('job-1');
  });

  it('strips Electron’s remote-method prefix from errors', async () => {
    window.shiori = {
      openDownloadDir: vi.fn(async () => {
        throw new Error("Error invoking remote method 'settings:open-download-dir': Error: Access is denied.");
      }),
    };

    await expect(openDownloadDir()).rejects.toThrow(/^Access is denied\.$/);
  });

  it('rejects instead of throwing when the desktop bridge is missing', async () => {
    const call = openDownloadDir();

    expect(call).toBeInstanceOf(Promise);
    await expect(call).rejects.toThrow(/only available in the Shiori desktop app/);
  });
});
