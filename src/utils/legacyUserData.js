import { DEFAULT_LIST_STATUS } from '@/constants/listStatuses';
import { groupByUserDataFile, isUserDataKey, USER_DATA_FILE_KEYS } from '@shared/userDataFiles';

const LEGACY_SERIES_IDS_KEY = 'mylist';
const LEGACY_KEYS_BY_FILE = { library: [LEGACY_SERIES_IDS_KEY] };

const listFromSeriesIds = (seriesIds, addedAt) =>
  Object.fromEntries(seriesIds.map((seriesId) => [seriesId, { status: DEFAULT_LIST_STATUS, addedAt }]));

export const withLegacyListConverted = (data, now = Date.now()) => {
  const legacySeriesIds = data[LEGACY_SERIES_IDS_KEY];

  if (data.list || !Array.isArray(legacySeriesIds)) return data;

  return { ...data, list: listFromSeriesIds(legacySeriesIds, now) };
};

export const userDataByFile = (data, now = Date.now()) => groupByUserDataFile(withLegacyListConverted(data, now));

export const storageKeysOwnedByFiles = (fileNames) =>
  fileNames.flatMap((fileName) => [...USER_DATA_FILE_KEYS[fileName], ...(LEGACY_KEYS_BY_FILE[fileName] ?? [])]);

export const withoutUserDataKeys = (data) =>
  Object.fromEntries(Object.entries(data).filter(([key]) => !isUserDataKey(key) && key !== LEGACY_SERIES_IDS_KEY));
