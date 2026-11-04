import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

const settings = vi.hoisted(() => ({ downloadDir: '' }));

vi.mock('electron', () => ({ app: { getPath: () => '' } }));
vi.mock('../../electron/ipc/settings.js', () => ({ getSettings: () => settings }));

const { resolveDownloadPath } = await import('../../electron/ipc/paths.js');

const driveRoot = path.parse(process.cwd()).root;

describe('resolveDownloadPath', () => {
  it('accepts files inside the download folder', () => {
    settings.downloadDir = path.join(driveRoot, 'Anime');

    expect(resolveDownloadPath(path.join('Show', 'Show - 01.mkv'))).toBe(
      path.join(driveRoot, 'Anime', 'Show', 'Show - 01.mkv'),
    );
  });

  it('accepts files when the download folder is the root of a drive', () => {
    settings.downloadDir = driveRoot;
    expect(resolveDownloadPath(path.join('Show', 'Show - 01.mkv'))).toBe(path.join(driveRoot, 'Show', 'Show - 01.mkv'));
  });

  it('accepts a file whose name starts with two dots', () => {
    settings.downloadDir = path.join(driveRoot, 'Anime');
    expect(resolveDownloadPath('..hidden.mkv')).toBe(path.join(driveRoot, 'Anime', '..hidden.mkv'));
  });

  it('rejects paths outside the download folder and the folder itself', () => {
    settings.downloadDir = path.join(driveRoot, 'Anime');
    expect(() => resolveDownloadPath(path.join('..', 'secret.txt'))).toThrow('Not in the download folder');
    expect(() => resolveDownloadPath(path.join(driveRoot, 'Anime2', 'file.mkv'))).toThrow('Not in the download folder');
    expect(() => resolveDownloadPath('')).toThrow('Not in the download folder');
  });
});
