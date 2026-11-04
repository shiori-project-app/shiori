import { describe, expect, it } from 'vitest';
import { damagedUserDataKeys, withDamagedUserDataRemoved } from '@shared/userDataFiles';

const healthyData = {
  list: { 1: { status: 'watching', addedAt: 1 } },
  watched: { 1: [1, 2] },
  watchDates: { '1-1': 1700000000000 },
  notes: { '1-1': [{ id: 'a', text: 'note', createdAt: 1 }] },
  tracking: { 1: { source: 'nyaa', handled: [] } },
  history: ['1-1', '1-2'],
  progress: { '1-2': 120.5 },
};

describe('damagedUserDataKeys', () => {
  it('finds nothing wrong with healthy or empty data', () => {
    expect(damagedUserDataKeys(healthyData)).toEqual([]);
    expect(damagedUserDataKeys({ list: {}, watched: {}, history: [], progress: {} })).toEqual([]);
  });

  it('ignores preferences and other keys it has no rule for', () => {
    expect(damagedUserDataKeys({ appearance: 'anything', mylist: [1] })).toEqual([]);
  });

  it('names each damaged key', () => {
    expect(damagedUserDataKeys({ ...healthyData, history: {}, watched: { 1: 'x' }, progress: null })).toEqual([
      'watched',
      'history',
      'progress',
    ]);
  });
});

describe('file links shape', () => {
  const healthyLink = { folders: ['D:\\Anime\\Rips'], episodes: { 3: 'D:\\Anime\\a.mkv' } };

  it('accepts healthy and partly filled links', () => {
    expect(damagedUserDataKeys({ fileLinks: { 7: healthyLink, 8: { folders: ['x'] }, 9: {} } })).toEqual([]);
  });

  it.each([
    ['null folders', { folders: null }],
    ['null episodes', { episodes: null }],
    ['folders that are not text', { folders: [1] }],
    ['episodes that are a list', { episodes: ['a.mkv'] }],
    ['an episode that is not text', { episodes: { 3: 5 } }],
    ['a link that is not an object', 'broken'],
  ])('reports %s, and removes only that show’s link', (_description, damagedLink) => {
    const data = { fileLinks: { 7: healthyLink, 8: damagedLink } };

    expect(damagedUserDataKeys(data)).toEqual(['fileLinks']);
    expect(withDamagedUserDataRemoved(data)).toEqual({ fileLinks: { 7: healthyLink } });
  });
});

describe('withDamagedUserDataRemoved', () => {
  it('returns healthy data unchanged', () => {
    expect(withDamagedUserDataRemoved(healthyData)).toEqual(healthyData);
  });

  it('keeps the good entries when only some are damaged, so one bad show loses nothing else', () => {
    const data = { watched: { 1: [1, 2], 2: 'broken', 3: [5] }, history: ['1-1', 7, '1-2'] };

    expect(withDamagedUserDataRemoved(data)).toEqual({ watched: { 1: [1, 2], 3: [5] }, history: ['1-1', '1-2'] });
  });

  it('drops a key of the wrong type, so the app starts that key from its default', () => {
    expect(withDamagedUserDataRemoved({ history: {}, progress: 'broken', list: [], appearance: 'kept' })).toEqual({
      appearance: 'kept',
    });
  });
});
