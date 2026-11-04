import { describe, expect, it } from 'vitest';
import { isSeasonEntry } from '@/api/services/seasonService';

describe('isSeasonEntry', () => {
  it('counts TV seasons and web seasons with several episodes', () => {
    expect(isSeasonEntry({ format: 'TV', episodes: 24 })).toBe(true);
    expect(isSeasonEntry({ format: 'TV_SHORT', episodes: 12 })).toBe(true);
    expect(isSeasonEntry({ format: 'ONA', episodes: 12 })).toBe(true);
  });

  it('passes over one-off specials, OVAs and movies (One Piece’s "prequel" MONSTERS is a 1-episode ONA)', () => {
    expect(isSeasonEntry({ format: 'ONA', episodes: 1 })).toBe(false);
    expect(isSeasonEntry({ format: 'ONA', episodes: null })).toBe(false);
    expect(isSeasonEntry({ format: 'OVA', episodes: 3 })).toBe(false);
    expect(isSeasonEntry({ format: 'MOVIE', episodes: 1 })).toBe(false);
  });
});
