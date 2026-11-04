import path from 'node:path';
import { app, ipcMain } from 'electron';
import { pickFileKeys, USER_DATA_FILE_NAMES, userDataFileForKey } from '../../shared/userDataFiles.js';
import { logError } from '../logger.js';
import { createUserDataFile, LOAD_STATUS } from '../userDataFile.js';
import { sendToAllWindows } from '../windowMessages.js';

const SAVE_DELAY_MS = 1000;

const dataFolder = () => path.join(app.getPath('userData'), 'data');

const notifyWindowsOfSaveFailure = (fileName) => sendToAllWindows('user-data:save-failed', fileName);

const reportSaveFailure = (fileName) => (error) => {
  logError(`Could not save ${fileName}.json`, error);
  notifyWindowsOfSaveFailure(fileName);
};

const createFilesByName = () =>
  Object.fromEntries(
    USER_DATA_FILE_NAMES.map((fileName) => [
      fileName,

      createUserDataFile({
        filePath: path.join(dataFolder(), `${fileName}.json`),
        saveDelayMs: SAVE_DELAY_MS,
        onSaveFailed: reportSaveFailure(fileName),
        onBackupFailed: (error) => logError(`Could not copy ${fileName}.json to its backup`, error),
      }),
    ]),
  );

let filesByName = {};

const logLoadProblem = (fileName, { status, error }) => {
  if (status === LOAD_STATUS.restoredFromBackup)
    logError(`${fileName}.json was damaged; restored from ${fileName}.json.bak`, error);

  if (status === LOAD_STATUS.unreadable) logError(`${fileName}.json could not be read; it was set aside`, error);
};

const loadFile = (fileName) => {
  const result = filesByName[fileName].load();

  logLoadProblem(fileName, result);

  return [fileName, { status: result.status, data: result.data }];
};

const loadAllFiles = () => Object.fromEntries(USER_DATA_FILE_NAMES.map(loadFile));

const saveValue = (_event, key, value) => {
  const fileName = userDataFileForKey(key);

  if (!fileName) throw new Error(`Unknown data key: ${key}`);

  filesByName[fileName].set(key, value);
};

const replaceFiles = (_event, dataByFile) => {
  if (!dataByFile || typeof dataByFile !== 'object') throw new Error('Nothing to save.');

  const fileNamesToReplace = USER_DATA_FILE_NAMES.filter((fileName) => dataByFile[fileName]);

  fileNamesToReplace.forEach((fileName) => filesByName[fileName].replace(pickFileKeys(fileName, dataByFile[fileName])));

  return fileNamesToReplace;
};

const flushAllFiles = () => Object.values(filesByName).forEach((userDataFile) => userDataFile.flush());

export const registerUserDataHandlers = () => {
  filesByName = createFilesByName();
  ipcMain.handle('user-data:load', loadAllFiles);
  ipcMain.handle('user-data:set', saveValue);
  ipcMain.handle('user-data:replace', replaceFiles);
  app.on('before-quit', flushAllFiles);
};
