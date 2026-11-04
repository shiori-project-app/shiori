import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renameUnsafeShowFolders, savePathAfterMoves } from '../../electron/showFolderMigration.js';

describe('renameUnsafeShowFolders', () => {
  let root = '';

  const folderNames = () => fs.readdirSync(root).sort();

  const addFile = (folder, name, content = 'video') => {
    fs.mkdirSync(path.join(root, folder), { recursive: true });
    fs.writeFileSync(path.join(root, folder, name), content);
  };

  const readFile = (folder, name) => fs.readFileSync(path.join(root, folder, name), 'utf8');

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'shiori-folders-'));
  });

  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

  it('renames folders ending in a dot or space, keeping every file inside', () => {
    addFile('Your Name.', 'Your Name. - 01.mp4');
    addFile('Gintama...', 'Gintama - 01.mp4');
    addFile('Spaced ', 'Spaced - 01.mp4');

    const moves = renameUnsafeShowFolders(root);

    expect(folderNames()).toEqual(['Gintama', 'Spaced', 'Your Name']);
    expect(readFile('Your Name', 'Your Name. - 01.mp4')).toBe('video');
    expect(moves).toHaveLength(3);
  });

  it('leaves normal folders, files and dots in the middle of a name alone', () => {
    addFile('Dr. Stone', 'Dr. Stone - 01.mp4');
    fs.writeFileSync(path.join(root, 'loose file.'), '');

    expect(renameUnsafeShowFolders(root)).toEqual([]);
    expect(folderNames()).toEqual(['Dr. Stone', 'loose file.']);
  });

  it('merges into a folder that already has the safe name, never overwriting a file', () => {
    addFile('Your Name', 'existing.mp4', 'keep me');
    addFile('Your Name.', 'existing.mp4', 'older copy');
    addFile('Your Name.', 'new.mp4', 'moved');

    const moves = renameUnsafeShowFolders(root);

    expect(readFile('Your Name', 'existing.mp4')).toBe('keep me');
    expect(readFile('Your Name', 'new.mp4')).toBe('moved');
    expect(readFile('Your Name.', 'existing.mp4')).toBe('older copy');
    expect(moves.map(({ to }) => path.basename(to))).toEqual(['new.mp4']);
  });

  it('removes the old folder once a merge has emptied it', () => {
    addFile('Your Name', 'first.mp4');
    addFile('Your Name.', 'second.mp4');

    renameUnsafeShowFolders(root);

    expect(folderNames()).toEqual(['Your Name']);
  });

  it('skips a folder made only of dots or spaces', () => {
    fs.mkdirSync(path.join(root, '...'));
    expect(renameUnsafeShowFolders(root)).toEqual([]);
    expect(folderNames()).toEqual(['...']);
  });

  it('reports a missing download folder instead of throwing, and moves nothing', () => {
    const onFailure = vi.fn();

    expect(renameUnsafeShowFolders(path.join(root, 'unplugged'), onFailure)).toEqual([]);
    expect(onFailure).toHaveBeenCalledTimes(1);
  });
});

describe('savePathAfterMoves', () => {
  const from = path.join('D:', 'Anime', 'Your Name.');
  const to = path.join('D:', 'Anime', 'Your Name');

  it('follows a renamed folder', () => {
    const moves = [{ from, to }];

    expect(savePathAfterMoves(path.join(from, 'ep1.mp4'), moves)).toBe(path.join(to, 'ep1.mp4'));
  });

  it('follows a merged file or its partial file', () => {
    const finished = [{ from: path.join(from, 'ep1.mp4'), to: path.join(to, 'ep1.mp4') }];
    const partial = [{ from: path.join(from, 'ep2.mp4.part'), to: path.join(to, 'ep2.mp4.part') }];

    expect(savePathAfterMoves(path.join(from, 'ep1.mp4'), finished)).toBe(path.join(to, 'ep1.mp4'));
    expect(savePathAfterMoves(path.join(from, 'ep2.mp4'), partial)).toBe(path.join(to, 'ep2.mp4'));
  });

  it('leaves unrelated paths alone, including a folder that only starts the same', () => {
    const moves = [{ from, to }];
    const similar = path.join('D:', 'Anime', 'Your Name. Part 2', 'ep1.mp4');

    expect(savePathAfterMoves(similar, moves)).toBe(similar);
  });
});
