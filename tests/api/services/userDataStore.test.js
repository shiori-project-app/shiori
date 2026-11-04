import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_PREFIX } from '@/config/app.config';

const fileStatus = (status, data = {}) => ({ status, data });

const putInBrowserStorage = (values) =>
  Object.entries(values).forEach(([key, value]) => localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value)));

const browserStorageKeys = () =>
  Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index))
    .map((fullKey) => fullKey.slice(STORAGE_PREFIX.length))
    .sort();

const fakeDesktop = (loadResult) => ({
  loadUserData: vi.fn(async () => loadResult),
  saveUserData: vi.fn(async () => {}),
  replaceUserData: vi.fn(async (dataByFile) => Object.keys(dataByFile)),
  onUserDataSaveFailed: vi.fn(() => () => {}),
});

const importStore = async () => {
  vi.resetModules();

  return import('@/api/services/userDataStore');
};

describe('user data store', () => {
  beforeEach(() => localStorage.clear());

  afterEach(() => {
    delete window.shiori;
  });

  it('moves data out of browser storage on first run and clears it only after the files are written', async () => {
    putInBrowserStorage({ mylist: [4], watched: { 4: [1] }, history: ['4-1'], appearance: { theme: 'nord' } });
    window.shiori = fakeDesktop({ library: fileStatus('missing'), activity: fileStatus('missing') });

    const { loadUserData, userDataStore } = await importStore();

    await loadUserData();

    const [migratedFiles] = window.shiori.replaceUserData.mock.calls[0];

    expect(Object.keys(migratedFiles.library.list)).toEqual(['4']);
    expect(migratedFiles.library.watched).toEqual({ 4: [1] });
    expect(migratedFiles.activity).toEqual({ history: ['4-1'] });
    expect(userDataStore.get('history')).toEqual(['4-1']);
    expect(browserStorageKeys()).toEqual(['appearance']);
  });

  it('keeps browser storage when the files could not be written, and warns', async () => {
    putInBrowserStorage({ watched: { 4: [1] } });
    window.shiori = fakeDesktop({ library: fileStatus('missing'), activity: fileStatus('missing') });
    window.shiori.replaceUserData.mockRejectedValue(new Error('disk full'));

    const { loadUserData, userDataStore } = await importStore();
    const { warnings } = await loadUserData();

    expect(warnings).toEqual([expect.stringContaining('disk full')]);
    expect(userDataStore.get('watched')).toEqual({ 4: [1] });
    expect(browserStorageKeys()).toEqual(['watched']);
  });

  it('uses the files when they exist and drops stale copies left in browser storage', async () => {
    putInBrowserStorage({ watched: { 1: [1] }, 'player-volume': { volume: 1 } });

    window.shiori = fakeDesktop({
      library: fileStatus('loaded', { watched: { 2: [5] } }),
      activity: fileStatus('restored-from-backup', { progress: { '2-5': 12 } }),
    });

    const { loadUserData, userDataStore } = await importStore();
    const { warnings } = await loadUserData();

    expect(window.shiori.replaceUserData).not.toHaveBeenCalled();
    expect(userDataStore.get('watched')).toEqual({ 2: [5] });
    expect(userDataStore.get('progress')).toEqual({ '2-5': 12 });
    expect(warnings).toEqual([expect.stringContaining('restored its previous copy')]);
    expect(browserStorageKeys()).toEqual(['player-volume']);
  });

  it('loads once even when asked twice, and only sends values that changed', async () => {
    window.shiori = fakeDesktop({ library: fileStatus('loaded', { list: {} }), activity: fileStatus('loaded') });

    const { loadUserData, userDataStore } = await importStore();

    await Promise.all([loadUserData(), loadUserData()]);
    userDataStore.set('list', userDataStore.get('list'));
    userDataStore.set('history', ['1-1']);

    expect(window.shiori.loadUserData).toHaveBeenCalledOnce();
    expect(window.shiori.saveUserData.mock.calls).toEqual([['history', ['1-1']]]);
  });

  it('backs up files and preferences together, and restores each to its own place', async () => {
    putInBrowserStorage({ appearance: { theme: 'nord' } });
    window.shiori = fakeDesktop({ library: fileStatus('loaded', { list: { 1: {} } }), activity: fileStatus('loaded') });

    const { loadUserData, restoreBackupData, snapshotForBackup, userDataStore } = await importStore();

    await loadUserData();

    expect(snapshotForBackup()).toEqual({ appearance: { theme: 'nord' }, list: { 1: {} } });

    await restoreBackupData({ list: { 9: {} }, history: ['9-1'], appearance: { theme: 'dracula' } });
    userDataStore.set('list', {});

    expect(window.shiori.replaceUserData).toHaveBeenCalledWith({
      library: { list: { 9: {} } },
      activity: { history: ['9-1'] },
    });

    expect(JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}appearance`))).toEqual({ theme: 'dracula' });
    expect(browserStorageKeys()).toEqual(['appearance']);
    expect(window.shiori.saveUserData).not.toHaveBeenCalled();
  });

  it('keeps everything in browser storage outside the desktop app', async () => {
    putInBrowserStorage({ notes: { '1-1': [] } });

    const { loadUserData, userDataStore } = await importStore();

    await loadUserData();
    userDataStore.set('history', ['1-1']);

    expect(userDataStore.get('notes')).toEqual({ '1-1': [] });
    expect(JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}history`))).toEqual(['1-1']);
  });
});
