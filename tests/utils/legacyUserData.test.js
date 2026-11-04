import { describe, expect, it } from 'vitest';
import { DEFAULT_LIST_STATUS } from '@/constants/listStatuses';
import {
  storageKeysOwnedByFiles,
  userDataByFile,
  withLegacyListConverted,
  withoutUserDataKeys,
} from '@/utils/legacyUserData';

const ADDED_AT = 1_700_000_000_000;

describe('legacy user data', () => {
  it('turns the old list of series ids into list entries, unless a list already exists', () => {
    expect(withLegacyListConverted({ mylist: [5, 9] }, ADDED_AT).list).toEqual({
      5: { status: DEFAULT_LIST_STATUS, addedAt: ADDED_AT },
      9: { status: DEFAULT_LIST_STATUS, addedAt: ADDED_AT },
    });

    const existingList = { 1: { status: 'completed' } };

    expect(withLegacyListConverted({ mylist: [5], list: existingList }, ADDED_AT).list).toBe(existingList);
  });

  it('groups storage values into the library and activity files, leaving preferences out', () => {
    const storageSnapshot = {
      list: { 1: {} },
      watched: { 1: [1] },
      notes: {},
      tracking: { 1: {} },
      history: ['1-1'],
      progress: { '1-1': 30 },
      appearance: { theme: 'nord' },
      autoplay: false,
      broken: null,
    };

    expect(userDataByFile(storageSnapshot, ADDED_AT)).toEqual({
      library: { list: { 1: {} }, watched: { 1: [1] }, notes: {}, tracking: { 1: {} } },
      activity: { history: ['1-1'], progress: { '1-1': 30 } },
    });
  });

  it('lists the storage keys each file replaces, including the old list key', () => {
    expect(storageKeysOwnedByFiles(['library'])).toEqual([
      'list',
      'watched',
      'watchDates',
      'notes',
      'tracking',
      'fileLinks',
      'mylist',
    ]);

    expect(storageKeysOwnedByFiles(['activity'])).toEqual(['history', 'progress']);
  });

  it('keeps only browser preferences when restoring into browser storage', () => {
    expect(withoutUserDataKeys({ list: {}, mylist: [1], history: [], appearance: {}, 'player-volume': {} })).toEqual({
      appearance: {},
      'player-volume': {},
    });
  });
});
