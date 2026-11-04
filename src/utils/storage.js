import { STORAGE_PREFIX } from '@/config/app.config';

const allLocalStorageKeys = () => Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index));

const shioriStorageKeys = () => allLocalStorageKeys().filter((fullKey) => fullKey.startsWith(STORAGE_PREFIX));

const withoutPrefix = (fullKey) => fullKey.slice(STORAGE_PREFIX.length);

const readValue = (key, fallback) => {
  try {
    const storedValue = localStorage.getItem(STORAGE_PREFIX + key);

    return storedValue ? (JSON.parse(storedValue) ?? fallback) : fallback;
  } catch {
    return fallback;
  }
};

const writeFailureListeners = new Set();

export const onStorageWriteFailure = (listener) => {
  writeFailureListeners.add(listener);

  return () => writeFailureListeners.delete(listener);
};

const writeValue = (key, value) => {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));

    return true;
  } catch (error) {
    writeFailureListeners.forEach((listener) => listener(key, error));

    return false;
  }
};

export const storage = {
  get: readValue,
  set: writeValue,
  remove: (key) => localStorage.removeItem(STORAGE_PREFIX + key),

  snapshot: () =>
    Object.fromEntries(
      shioriStorageKeys()
        .map(withoutPrefix)
        .map((key) => [key, readValue(key, null)]),
    ),

  replaceAll: (data) => {
    shioriStorageKeys().forEach((fullKey) => localStorage.removeItem(fullKey));
    Object.entries(data).forEach(([key, value]) => localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value)));
  },
};
