import fs from 'node:fs';
import path from 'node:path';
import { isPlainObject, USER_DATA_FORMAT_VERSION } from '../shared/userDataFiles.js';
import { writeFileAtomically } from './fileSystem.js';

const DEFAULT_SAVE_RETRY_DELAY_MS = 5000;

export const LOAD_STATUS = {
  loaded: 'loaded',
  missing: 'missing',
  restoredFromBackup: 'restored-from-backup',
  unreadable: 'unreadable',
};

export const NEWER_FORMAT_ERROR_CODE = 'SHIORI_NEWER_DATA_FORMAT';

export const backupPathFor = (filePath) => `${filePath}.bak`;

const setAsidePathFor = (filePath, timestamp) => `${filePath}.unreadable-${timestamp}`;

const newerFormatError = (filePath) =>
  Object.assign(
    new Error(`${path.basename(filePath)} was saved by a newer version of Shiori. Update Shiori to open it.`),
    { code: NEWER_FORMAT_ERROR_CODE },
  );

const parseDocument = (filePath, text) => {
  const document = JSON.parse(text);

  if (!isPlainObject(document) || !Number.isInteger(document.format) || !isPlainObject(document.data)) {
    throw new Error(`${path.basename(filePath)} isn’t a Shiori data file.`);
  }

  if (document.format > USER_DATA_FORMAT_VERSION) throw newerFormatError(filePath);

  return document.data;
};

const readDocument = (filePath) =>
  fs.existsSync(filePath) ? parseDocument(filePath, fs.readFileSync(filePath, 'utf8')) : null;

const isNewerFormat = (error) => error.code === NEWER_FORMAT_ERROR_CODE;

const attemptRead = (filePath) => {
  try {
    return { data: readDocument(filePath), error: null };
  } catch (error) {
    if (isNewerFormat(error)) throw error;

    return { data: null, error };
  }
};

const readUserDataFile = (filePath) => {
  const mainCopy = attemptRead(filePath);

  if (mainCopy.data) return { status: LOAD_STATUS.loaded, data: mainCopy.data };

  const backupCopy = attemptRead(backupPathFor(filePath));

  if (backupCopy.data) return { status: LOAD_STATUS.restoredFromBackup, data: backupCopy.data, error: mainCopy.error };
  if (mainCopy.error) return { status: LOAD_STATUS.unreadable, data: {}, error: mainCopy.error };

  return { status: LOAD_STATUS.missing, data: {} };
};

const serializeDocument = (data, timestamp) =>
  JSON.stringify({ format: USER_DATA_FORMAT_VERSION, savedAt: new Date(timestamp).toISOString(), data });

const needsSettingAside = (status) => status === LOAD_STATUS.restoredFromBackup || status === LOAD_STATUS.unreadable;

const copyToBackupIfPossible = (filePath, onBackupFailed) => {
  try {
    if (fs.existsSync(filePath)) fs.copyFileSync(filePath, backupPathFor(filePath));
  } catch (error) {
    onBackupFailed(error);
  }
};

export const createUserDataFile = ({
  filePath,
  saveDelayMs,
  onSaveFailed,
  onBackupFailed = () => {},
  saveRetryDelayMs = DEFAULT_SAVE_RETRY_DELAY_MS,
  now = Date.now,
}) => {
  let data = {};
  let hasLoaded = false;

  let isOnDisk = false;
  let pendingSave = null;

  let hasReportedFailure = false;

  const cancelPendingSave = () => {
    clearTimeout(pendingSave);
    pendingSave = null;
  };

  const writeNow = () => {
    cancelPendingSave();
    copyToBackupIfPossible(filePath, onBackupFailed);
    writeFileAtomically(filePath, serializeDocument(data, now()));
    isOnDisk = true;
    hasReportedFailure = false;
  };

  const saveReportingFailure = () => {
    try {
      writeNow();
    } catch (error) {
      pendingSave = setTimeout(saveReportingFailure, saveRetryDelayMs);

      if (!hasReportedFailure) onSaveFailed(error);

      hasReportedFailure = true;
    }
  };

  const scheduleSave = () => {
    pendingSave ??= setTimeout(saveReportingFailure, saveDelayMs);
  };

  const setAsideDamagedFile = () => {
    if (fs.existsSync(filePath)) fs.renameSync(filePath, setAsidePathFor(filePath, now()));
  };

  const loadFromDisk = () => {
    const result = readUserDataFile(filePath);

    if (needsSettingAside(result.status)) setAsideDamagedFile();

    data = result.data;
    hasLoaded = true;
    isOnDisk = result.status === LOAD_STATUS.loaded || result.status === LOAD_STATUS.restoredFromBackup;

    if (result.status === LOAD_STATUS.restoredFromBackup) scheduleSave();

    return result;
  };

  const load = () =>
    hasLoaded ? { status: isOnDisk ? LOAD_STATUS.loaded : LOAD_STATUS.missing, data } : loadFromDisk();

  const set = (key, value) => {
    if (!hasLoaded) loadFromDisk();

    data = { ...data, [key]: value };
    scheduleSave();
  };

  const confirmWritten = () => {
    if (JSON.stringify(readDocument(filePath)) !== JSON.stringify(data)) {
      throw new Error(`${path.basename(filePath)} didn’t save correctly.`);
    }
  };

  const replace = (nextData) => {
    data = nextData;
    hasLoaded = true;
    writeNow();
    confirmWritten();
  };

  const flush = () => {
    if (pendingSave) saveReportingFailure();
  };

  return { load, set, replace, flush };
};
