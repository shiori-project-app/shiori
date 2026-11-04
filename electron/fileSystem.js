import fs from 'node:fs';
import path from 'node:path';

const LOCKED_FILE_ERROR_CODES = ['EPERM', 'EBUSY', 'EACCES'];
const RENAME_RETRY_DELAYS_MS = [50, 150, 300];

let temporaryFilesCreated = 0;

const temporaryPathFor = (filePath) => {
  temporaryFilesCreated += 1;

  return `${filePath}.${process.pid}.${temporaryFilesCreated}.tmp`;
};

const isLockedFileError = (error) => LOCKED_FILE_ERROR_CODES.includes(error.code);

const waitSynchronously = (milliseconds) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);

const renameWhenUnlocked = (fromPath, toPath, retryDelays = RENAME_RETRY_DELAYS_MS) => {
  try {
    fs.renameSync(fromPath, toPath);
  } catch (error) {
    if (!isLockedFileError(error) || !retryDelays.length) throw error;

    const [delay, ...laterDelays] = retryDelays;

    waitSynchronously(delay);
    renameWhenUnlocked(fromPath, toPath, laterDelays);
  }
};

const renameWhenUnlockedAsync = async (fromPath, toPath, retryDelays = RENAME_RETRY_DELAYS_MS) => {
  try {
    await fs.promises.rename(fromPath, toPath);
  } catch (error) {
    if (!isLockedFileError(error) || !retryDelays.length) throw error;

    const [delay, ...laterDelays] = retryDelays;

    await new Promise((resolve) => setTimeout(resolve, delay));
    await renameWhenUnlockedAsync(fromPath, toPath, laterDelays);
  }
};

const removeLeftoverFile = (filePath) => {
  try {
    fs.rmSync(filePath, { force: true });
  } catch {
    return;
  }
};

const removeLeftoverFileAsync = (filePath) => fs.promises.rm(filePath, { force: true }).catch(() => {});

export const writeFileAtomically = (filePath, content) => {
  const temporaryPath = temporaryPathFor(filePath);

  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  try {
    fs.writeFileSync(temporaryPath, content);
    renameWhenUnlocked(temporaryPath, filePath);
  } catch (error) {
    removeLeftoverFile(temporaryPath);

    throw error;
  }
};

export const writeFileAtomicallyAsync = async (filePath, content) => {
  const temporaryPath = temporaryPathFor(filePath);

  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });

  try {
    await fs.promises.writeFile(temporaryPath, content);
    await renameWhenUnlockedAsync(temporaryPath, filePath);
  } catch (error) {
    await removeLeftoverFileAsync(temporaryPath);

    throw error;
  }
};

const EMPTY_USAGE = { bytes: 0, files: 0 };

const addUsage = (total, usage) => ({ bytes: total.bytes + usage.bytes, files: total.files + usage.files });

const fileUsage = async (filePath) => {
  const stats = await fs.promises.stat(filePath).catch(() => null);

  return stats ? { bytes: stats.size, files: 1 } : EMPTY_USAGE;
};

export const folderUsage = async (folder) => {
  const entries = await fs.promises.readdir(folder, { withFileTypes: true }).catch(() => []);

  const usages = await Promise.all(
    entries.map((entry) => {
      const entryPath = path.join(folder, entry.name);

      return entry.isDirectory() ? folderUsage(entryPath) : fileUsage(entryPath);
    }),
  );

  return usages.reduce(addUsage, EMPTY_USAGE);
};
