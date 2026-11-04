import path from 'node:path';
import { safeName } from '../../shared/fileNames.js';
import { getSettings } from './settings.js';

const PARENT_FOLDER = '..';

export const downloadsRoot = () => getSettings().downloadDir;

export const isInsideFolder = (folder, target) => {
  const relativePath = path.relative(folder, target);

  return relativePath !== '' && !path.isAbsolute(relativePath) && relativePath.split(path.sep)[0] !== PARENT_FOLDER;
};

export const resolveDownloadPath = (relativePath) => {
  const rootFolder = path.resolve(downloadsRoot());
  const target = path.resolve(rootFolder, String(relativePath));

  if (!isInsideFolder(rootFolder, target)) throw new Error('Not in the download folder');

  return target;
};

export const showFolder = (title) => path.join(downloadsRoot(), safeName(title));
