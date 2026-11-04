import fs from 'node:fs';
import path from 'node:path';
import { withoutUnsafeNameEnding } from '../shared/fileNames.js';

const PARTIAL_FILE_SUFFIX = '.part';

const isEmptyFolder = (folder) => fs.readdirSync(folder).length === 0;

const moveIfFree = (fromPath, toPath, onFailure) => {
  if (fs.existsSync(toPath)) return [];

  try {
    fs.renameSync(fromPath, toPath);

    return [{ from: fromPath, to: toPath }];
  } catch (error) {
    onFailure(fromPath, error);

    return [];
  }
};

const removeIfEmpty = (folder, onFailure) => {
  try {
    if (isEmptyFolder(folder)) fs.rmdirSync(folder);
  } catch (error) {
    onFailure(folder, error);
  }
};

const mergeIntoExistingFolder = (fromFolder, toFolder, onFailure) => {
  const moves = fs
    .readdirSync(fromFolder)
    .flatMap((name) => moveIfFree(path.join(fromFolder, name), path.join(toFolder, name), onFailure));

  removeIfEmpty(fromFolder, onFailure);

  return moves;
};

const moveFolderToSafeName = (rootFolder, name, onFailure) => {
  const safeFolderName = withoutUnsafeNameEnding(name);

  if (!safeFolderName) return [];

  const fromFolder = path.join(rootFolder, name);
  const toFolder = path.join(rootFolder, safeFolderName);

  return fs.existsSync(toFolder)
    ? mergeIntoExistingFolder(fromFolder, toFolder, onFailure)
    : moveIfFree(fromFolder, toFolder, onFailure);
};

export const renameUnsafeShowFolders = (rootFolder, onFailure = () => {}) => {
  try {
    return fs
      .readdirSync(rootFolder, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && withoutUnsafeNameEnding(entry.name) !== entry.name)
      .flatMap((entry) => moveFolderToSafeName(rootFolder, entry.name, onFailure));
  } catch (error) {
    onFailure(rootFolder, error);

    return [];
  }
};

const movedPath = (savePath, { from, to }) => {
  if (savePath === from) return to;
  if (`${savePath}${PARTIAL_FILE_SUFFIX}` === from) return to.slice(0, -PARTIAL_FILE_SUFFIX.length);

  return savePath.startsWith(`${from}${path.sep}`) ? `${to}${savePath.slice(from.length)}` : null;
};

export const savePathAfterMoves = (savePath, moves) =>
  moves.map((move) => movedPath(savePath, move)).find(Boolean) ?? savePath;
