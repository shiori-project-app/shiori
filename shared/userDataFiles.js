export const USER_DATA_FORMAT_VERSION = 1;

export const USER_DATA_FILE_KEYS = {
  library: ['list', 'watched', 'watchDates', 'notes', 'tracking', 'fileLinks'],
  activity: ['history', 'progress'],
};

export const USER_DATA_FILE_NAMES = Object.keys(USER_DATA_FILE_KEYS);

const USER_DATA_KEYS = Object.values(USER_DATA_FILE_KEYS).flat();

export const isUserDataKey = (key) => USER_DATA_KEYS.includes(key);

export const userDataFileForKey = (key) =>
  USER_DATA_FILE_NAMES.find((fileName) => USER_DATA_FILE_KEYS[fileName].includes(key)) ?? null;

export const pickFileKeys = (fileName, data) =>
  Object.fromEntries(USER_DATA_FILE_KEYS[fileName].filter((key) => data?.[key] != null).map((key) => [key, data[key]]));

export const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const isText = (value) => typeof value === 'string';

const isFileLinksEntry = (entry) =>
  isPlainObject(entry) &&
  (entry.folders === undefined || (Array.isArray(entry.folders) && entry.folders.every(isText))) &&
  (entry.episodes === undefined || (isPlainObject(entry.episodes) && Object.values(entry.episodes).every(isText)));

const objectOf = (isEntry) => ({
  matches: (value) => isPlainObject(value) && Object.values(value).every(isEntry),

  withoutDamagedEntries: (value) =>
    isPlainObject(value) ? Object.fromEntries(Object.entries(value).filter(([, entry]) => isEntry(entry))) : undefined,
});

const arrayOf = (isEntry) => ({
  matches: (value) => Array.isArray(value) && value.every(isEntry),
  withoutDamagedEntries: (value) => (Array.isArray(value) ? value.filter(isEntry) : undefined),
});

const USER_DATA_SHAPES = {
  list: objectOf(isPlainObject),
  watched: objectOf(Array.isArray),
  watchDates: objectOf(Number.isFinite),
  notes: objectOf(Array.isArray),
  tracking: objectOf(isPlainObject),
  fileLinks: objectOf(isFileLinksEntry),
  history: arrayOf(isText),
  progress: objectOf(Number.isFinite),
};

const hasExpectedShape = (key, value) => USER_DATA_SHAPES[key]?.matches(value) ?? true;

export const damagedUserDataKeys = (data) => Object.keys(data).filter((key) => !hasExpectedShape(key, data[key]));

export const withDamagedUserDataRemoved = (data) =>
  Object.fromEntries(
    Object.entries(data)
      .map(([key, value]) => [
        key,
        hasExpectedShape(key, value) ? value : USER_DATA_SHAPES[key].withoutDamagedEntries(value),
      ])
      .filter(([, value]) => value !== undefined),
  );

export const groupByUserDataFile = (data) =>
  Object.fromEntries(USER_DATA_FILE_NAMES.map((fileName) => [fileName, pickFileKeys(fileName, data)]));
