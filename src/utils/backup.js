import { damagedUserDataKeys } from '@shared/userDataFiles';

const BACKUP_FORMAT_VERSION = 1;
const BACKUP_APP_NAME = 'Shiori';
const STORAGE_KEY_PATTERN = /^[a-zA-Z0-9-]+$/;

const keyCount = (value) => (value && typeof value === 'object' ? Object.keys(value).length : 0);

const arrayLength = (value) => (Array.isArray(value) ? value.length : 0);

export const createBackup = (data, now = new Date()) =>
  JSON.stringify({ app: BACKUP_APP_NAME, format: BACKUP_FORMAT_VERSION, exportedAt: now.toISOString(), data }, null, 2);

const summarizeBackup = (data) => ({
  list: keyCount(data.list),
  watchedShows: keyCount(data.watched),
  history: arrayLength(data.history),
  notes: Object.values(data.notes ?? {}).reduce((total, seriesNotes) => total + arrayLength(seriesNotes), 0),
  tracked: keyCount(data.tracking),
});

const parseJsonOrExplain = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('This file isn’t a Shiori backup (it isn’t valid JSON).');
  }
};

const isShioriBackup = (backup) =>
  backup?.app === BACKUP_APP_NAME && typeof backup.data === 'object' && backup.data !== null;

const onlyStorageKeys = (data) =>
  Object.fromEntries(Object.entries(data).filter(([key]) => STORAGE_KEY_PATTERN.test(key)));

export const parseBackup = (text) => {
  const backup = parseJsonOrExplain(text);

  if (!isShioriBackup(backup)) throw new Error('This file isn’t a Shiori backup.');

  if (backup.format > BACKUP_FORMAT_VERSION) {
    throw new Error('This backup was made by a newer version of Shiori. Update Shiori to restore it.');
  }

  const data = onlyStorageKeys(backup.data);
  const damagedKeys = damagedUserDataKeys(data);

  if (damagedKeys.length) {
    throw new Error(`This backup is damaged and can’t be restored (bad data in: ${damagedKeys.join(', ')}).`);
  }

  return { data, exportedAt: backup.exportedAt ?? null, summary: summarizeBackup(data) };
};
