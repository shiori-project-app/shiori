import { describe, expect, it } from 'vitest';
import { anyOf, episodeQueries, plainWords } from '@/api/services/torrentService';

const soloS2 = {
  title: 'Solo Leveling Season 2 -Arise from the Shadow-',
  romajiTitle: 'Ore dake Level Up na Ken: Season 2 - Arise from the Shadow',
  synonyms: [],
};

describe('Nyaa queries', () => {
  it('turns titles into plain words, so nothing is read as an operator', () => {
    expect(plainWords('Solo Leveling Season 2 -Arise from the Shadow-')).toBe(
      'Solo Leveling Season 2 Arise from the Shadow',
    );

    expect(plainWords('Ore dake Level Up na Ken: Season 2 - Arise from the Shadow 11')).toBe(
      'Ore dake Level Up na Ken Season 2 Arise from the Shadow 11',
    );

    expect(plainWords('Kaguya-sama (TV) "Love" 05')).toBe('Kaguya-sama TV Love 05');
  });

  it('combines several spellings into one query, and leaves a single (typed) query as it is', () => {
    expect(anyOf(['Solo Leveling 23', 'Solo Leveling S2 11'])).toBe('(Solo Leveling 23)|(Solo Leveling S2 11)');
    expect(anyOf(['frieren -dub'])).toBe('frieren -dub');
  });

  it('also searches the numbers releases use across seasons and parts', () => {
    const [queries] = episodeQueries(soloS2, 11, {
      offset: 12,
      sameSeasonOffset: 0,
      firstSeason: { romajiTitle: 'Ore dake Level Up na Ken', title: 'Solo Leveling' },
    });

    expect(queries).toContain('Solo Leveling 23');
    expect(queries).toContain('Ore dake Level Up na Ken 23');
    expect(queries).toContain('Ore dake Level Up na Ken S2 11');
    expect(queries.some((q) => q.endsWith(' 12'))).toBe(false);
  });

  it('searches "S04E05" for a later season, as many releases name episodes', () => {
    const slimeS4 = {
      romajiTitle: 'Tensei Shitara Slime Datta Ken 4th Season Part 1 & 2',
      title: 'That Time I Got Reincarnated as a Slime Season 4',
      synonyms: [],
    };

    const [queries] = episodeQueries(slimeS4, 5, {});

    expect(queries).toContain('That Time I Got Reincarnated as a Slime S04E05');
    expect(queries).toContain('Tensei Shitara Slime Datta Ken 4th Season 05');
  });
});
