import { describe, expect, it } from 'vitest';
import { trashNameOn } from '@shared/platformNames';

describe('trashNameOn', () => {
  it.each([
    ['linux', 'Trash'],
    ['win32', 'Recycle Bin'],
    [null, 'Recycle Bin'],
  ])('on %s it is the %s', (platform, name) => {
    expect(trashNameOn(platform)).toBe(name);
  });
});
