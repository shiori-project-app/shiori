import { describe, expect, it, vi } from 'vitest';

const windows = vi.hoisted(() => [{ webContents: { send: vi.fn() } }, { webContents: { send: vi.fn() } }]);

vi.mock('electron', () => ({ BrowserWindow: { getAllWindows: () => windows } }));

const { sendToAllWindows } = await import('../../electron/windowMessages.js');

describe('sendToAllWindows', () => {
  it('sends the channel and everything after it to every window', () => {
    sendToAllWindows('downloads:changed', ['job'], 2);

    windows.forEach(({ webContents }) =>
      expect(webContents.send).toHaveBeenCalledExactlyOnceWith('downloads:changed', ['job'], 2),
    );
  });
});
