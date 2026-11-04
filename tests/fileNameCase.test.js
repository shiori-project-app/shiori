import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const PROJECT_ROOT = process.cwd();
const CHECKED_FOLDERS = ['src', 'electron', 'shared', 'tests'];
const CODE_FILE = /\.(js|jsx|cjs|mjs|scss)$/;
const FIXTURES_FOLDER = /[\\/]fixtures[\\/]/;
const IMPORTED_PATH = /(?:\bfrom\s+|\bimport\s+|\bimport\(\s*|\bvi\.mock\(\s*|@use\s+|@forward\s+)['"]([^'"]+)['"]/g;

const ALIASES = { '@/': 'src/', '@shared/': 'shared/' };

const baseFolderOf = (importedPath, importingFile) => {
  if (importedPath.startsWith('.')) return { folder: path.dirname(importingFile), rest: importedPath };

  const alias = Object.keys(ALIASES).find((prefix) => importedPath.startsWith(prefix));

  return alias
    ? { folder: path.join(PROJECT_ROOT, ALIASES[alias]), rest: importedPath.slice(alias.length) }
    : { folder: path.join(PROJECT_ROOT, 'node_modules'), rest: importedPath };
};

const withoutExtensionAndPartialMark = (name) => name.replace(/^_/, '').replace(/\.[^.]+$/, '');

const readEntryNames = (folder) => {
  try {
    return fs.readdirSync(folder);
  } catch {
    return [];
  }
};

const namesMatch = (entryName, segment) =>
  entryName === segment || withoutExtensionAndPartialMark(entryName) === withoutExtensionAndPartialMark(segment);

const wrongCaseSegment = (startFolder, relativePath) =>
  relativePath.split('/').reduce(
    ({ folder, mismatch }, segment) => {
      if (mismatch || !folder || segment === '.' || segment === '..' || !segment) {
        return { folder: folder && path.join(folder, segment), mismatch };
      }

      const entries = readEntryNames(folder);

      if (entries.some((entry) => namesMatch(entry, segment))) return { folder: path.join(folder, segment), mismatch };

      const wrongCaseEntry = entries.find((entry) => namesMatch(entry.toLowerCase(), segment.toLowerCase()));

      return { folder: null, mismatch: wrongCaseEntry ? `${segment} is really ${wrongCaseEntry}` : null };
    },
    { folder: startFolder, mismatch: null },
  ).mismatch;

const projectCodeFiles = () =>
  CHECKED_FOLDERS.flatMap((folder) =>
    fs
      .readdirSync(path.join(PROJECT_ROOT, folder), { recursive: true })
      .filter((file) => CODE_FILE.test(file))
      .map((file) => path.join(PROJECT_ROOT, folder, file)),
  ).filter((file) => !FIXTURES_FOLDER.test(file));

const importsWithWrongCase = (file) =>
  [...fs.readFileSync(file, 'utf8').matchAll(IMPORTED_PATH)].flatMap(([, importedPath]) => {
    const { folder, rest } = baseFolderOf(importedPath, file);
    const mismatch = wrongCaseSegment(folder, rest);

    return mismatch ? [`${path.relative(PROJECT_ROOT, file)}: ${importedPath} (${mismatch})`] : [];
  });

describe('file names in imports', () => {
  it('match the real capitals, or the app builds on Windows and breaks on Linux', () => {
    expect(projectCodeFiles().flatMap(importsWithWrongCase)).toEqual([]);
  });

  it('are really being checked', () => {
    const anyFolder = path.join(PROJECT_ROOT, 'src');

    expect(wrongCaseSegment(anyFolder, 'COMPONENTS/common/Modal')).toBe('COMPONENTS is really components');
    expect(wrongCaseSegment(anyFolder, 'components/common/modal')).toBe('modal is really Modal.jsx');
    expect(wrongCaseSegment(anyFolder, 'components/common/Modal')).toBeNull();
    expect(wrongCaseSegment(anyFolder, 'no/such/file')).toBeNull();
  });
});
