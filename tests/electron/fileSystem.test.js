import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { folderUsage, writeFileAtomically, writeFileAtomicallyAsync } from '../../electron/fileSystem.js';

const testFolder = fs.mkdtempSync(path.join(os.tmpdir(), 'shiori-files-'));

describe('atomic file writes', () => {
  afterEach(() => fs.rmSync(testFolder, { recursive: true, force: true }));

  it('replaces the file and leaves no temporary file behind', async () => {
    const settingsFile = path.join(testFolder, 'nested', 'settings.json');

    writeFileAtomically(settingsFile, '{"a":1}');
    await writeFileAtomicallyAsync(settingsFile, '{"a":2}');
    expect(fs.readFileSync(settingsFile, 'utf8')).toBe('{"a":2}');
    expect(fs.readdirSync(path.dirname(settingsFile))).toEqual(['settings.json']);
  });

  it('keeps simultaneous saves of the same file from sharing a temporary file', async () => {
    const coverFile = path.join(testFolder, 'covers', 'cover.jpg');
    const versions = ['first', 'second', 'third', 'fourth'];
    const saves = await Promise.allSettled(versions.map((version) => writeFileAtomicallyAsync(coverFile, version)));

    expect(saves.map(({ status }) => status)).toContain('fulfilled');
    expect(saves.filter(({ reason }) => reason?.code === 'ENOENT')).toEqual([]);
    expect(versions).toContain(fs.readFileSync(coverFile, 'utf8'));
  });

  it('adds up the size and count of files in nested folders, and treats a missing folder as empty', async () => {
    writeFileAtomically(path.join(testFolder, 'cache', 'a.json'), '12345');
    writeFileAtomically(path.join(testFolder, 'cache', 'covers', 'b.jpg'), '123');
    expect(await folderUsage(path.join(testFolder, 'cache'))).toEqual({ bytes: 8, files: 2 });
    expect(await folderUsage(path.join(testFolder, 'missing'))).toEqual({ bytes: 0, files: 0 });
  });
});
