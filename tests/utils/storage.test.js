import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { STORAGE_PREFIX } from '@/config/app.config';
import { storage } from '@/utils/storage';

const store = (key, rawValue) => localStorage.setItem(STORAGE_PREFIX + key, rawValue);

describe('storage.get', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('reads a saved value', () => {
    store('answer', JSON.stringify({ value: 42 }));

    expect(storage.get('answer', {})).toEqual({ value: 42 });
  });

  it('uses the fallback when nothing is saved', () => {
    expect(storage.get('missing', 'fallback')).toBe('fallback');
  });

  it('uses the fallback for damaged data', () => {
    store('damaged', '{ not json');

    expect(storage.get('damaged', 'fallback')).toBe('fallback');
  });

  it('uses the fallback for a saved null, which a hand-edited backup can leave behind', () => {
    store('empty', 'null');

    expect(storage.get('empty', 'fallback')).toBe('fallback');
  });

  it.each([
    ['false', false],
    ['0', 0],
    ['""', ''],
  ])('keeps the saved value %s, which is real data and not missing', (rawValue, expected) => {
    store('falsy', rawValue);

    expect(storage.get('falsy', 'fallback')).toBe(expected);
  });
});
