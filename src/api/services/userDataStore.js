import {
  hasDesktopBridge,
  loadUserData as loadUserDataFiles,
  onUserDataSaveFailed,
  replaceUserData,
  saveUserData,
} from '@/api/clients/desktopClient';
import { storageKeysOwnedByFiles, userDataByFile, withoutUserDataKeys } from '@/utils/legacyUserData';
import { storage } from '@/utils/storage';
import { damagedUserDataKeys, USER_DATA_FILE_NAMES, withDamagedUserDataRemoved } from '@shared/userDataFiles';

const STATUSES_NEEDING_MIGRATION = ['missing', 'unreadable'];

const FILE_DESCRIPTIONS = {
  library: 'library (My List, watched episodes, notes, tracked shows)',
  activity: 'watch history',
};

const LOAD_WARNINGS = {
  'restored-from-backup': (fileName) =>
    `Your ${FILE_DESCRIPTIONS[fileName]} file was damaged, so Shiori restored its previous copy.`,

  unreadable: (fileName) =>
    `Shiori couldn’t read your ${FILE_DESCRIPTIONS[fileName]} file and started it fresh. The damaged copy was kept in the data folder.`,
};

let loadedData = {};
let isAcceptingChanges = true;
let loadingPromise = null;
const saveFailureListeners = new Set();

export const onUserDataSaveFailure = (listener) => {
  saveFailureListeners.add(listener);

  return () => saveFailureListeners.delete(listener);
};

const reportSaveFailure = (error) => saveFailureListeners.forEach((listener) => listener(error));

const mergeFileData = (dataByFile) => Object.assign({}, ...Object.values(dataByFile));

const loadWarningsFor = (files) =>
  USER_DATA_FILE_NAMES.filter((fileName) => LOAD_WARNINGS[files[fileName].status]).map((fileName) =>
    LOAD_WARNINGS[files[fileName].status](fileName),
  );

const damagedDataWarnings = (data) => {
  const damagedKeys = damagedUserDataKeys(data);

  return damagedKeys.length
    ? [`Some of your saved data was damaged and was left out (${damagedKeys.join(', ')}).`]
    : [];
};

const migrateFromBrowserStorage = async (fileNames) => {
  if (!fileNames.length) return { data: {}, succeeded: true, warnings: [] };

  const legacyDataByFile = userDataByFile(storage.snapshot());
  const dataToMigrate = Object.fromEntries(fileNames.map((fileName) => [fileName, legacyDataByFile[fileName]]));

  try {
    await replaceUserData(dataToMigrate);

    return { data: mergeFileData(dataToMigrate), succeeded: true, warnings: [] };
  } catch (error) {
    return {
      data: mergeFileData(dataToMigrate),
      succeeded: false,

      warnings: [
        `Shiori couldn’t move your data into its data folder (${error.message}). It will try again next time.`,
      ],
    };
  }
};

const loadFromFiles = async () => {
  const files = await loadUserDataFiles();

  const fileNamesToMigrate = USER_DATA_FILE_NAMES.filter((fileName) =>
    STATUSES_NEEDING_MIGRATION.includes(files[fileName].status),
  );

  const migration = await migrateFromBrowserStorage(fileNamesToMigrate);

  const fileNamesOnDisk = USER_DATA_FILE_NAMES.filter(
    (fileName) => migration.succeeded || !fileNamesToMigrate.includes(fileName),
  );

  storageKeysOwnedByFiles(fileNamesOnDisk).forEach(storage.remove);
  onUserDataSaveFailed(reportSaveFailure);

  const dataFromFiles = Object.fromEntries(USER_DATA_FILE_NAMES.map((fileName) => [fileName, files[fileName].data]));
  const savedData = { ...mergeFileData(dataFromFiles), ...migration.data };

  loadedData = withDamagedUserDataRemoved(savedData);

  return { warnings: [...loadWarningsFor(files), ...migration.warnings, ...damagedDataWarnings(savedData)] };
};

const loadFromBrowserStorage = async () => {
  loadedData = mergeFileData(userDataByFile(storage.snapshot()));

  return { warnings: [] };
};

export const loadUserData = () => {
  loadingPromise ??= (hasDesktopBridge() ? loadFromFiles() : loadFromBrowserStorage()).catch((error) => {
    loadingPromise = null;

    throw error;
  });

  return loadingPromise;
};

const saveValue = (key, value) => {
  if (!hasDesktopBridge()) {
    storage.set(key, value);

    return;
  }

  saveUserData(key, value).catch(reportSaveFailure);
};

export const userDataStore = {
  get: (key, fallback) => loadedData[key] ?? fallback,

  set: (key, value) => {
    if (!isAcceptingChanges || loadedData[key] === value) return;

    loadedData = { ...loadedData, [key]: value };
    saveValue(key, value);
  },
};

export const snapshotForBackup = () => ({ ...storage.snapshot(), ...loadedData });

const replaceEverything = async (data) => {
  if (!hasDesktopBridge()) {
    storage.replaceAll(data);

    return;
  }

  await replaceUserData(userDataByFile(data));
  storage.replaceAll(withoutUserDataKeys(data));
};

export const restoreBackupData = async (data) => {
  isAcceptingChanges = false;

  try {
    await replaceEverything(data);
  } catch (error) {
    isAcceptingChanges = true;

    throw error;
  }
};
