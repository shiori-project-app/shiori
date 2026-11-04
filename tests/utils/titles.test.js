import { describe, expect, it } from 'vitest';
import { genresToExclude } from '@/utils/contentFilter';
import {
  displayTitle,
  markedSeason,
  otherTitles,
  releaseTitleVariants,
  seasonNumber,
  seriesSeason,
  withoutSeason,
} from '@/utils/titles';

describe('seasonNumber', () => {
  it.each([
    ['Sousou no Frieren 2nd Season', 2],
    ['Frieren: Beyond Journey’s End Season 2', 2],
    ['Sousou no Frieren S2', 2],
    ['Mushoku Tensei III: Isekai Ittara Honki Dasu', 3],
    ['Mushoku Tensei II: Isekai Ittara Honki Dasu Part 2', 2],
    ['Overlord IV', 4],
    ['Diamond no Ace act II: Second Season Part 2', 2],
    ['Ace of the Diamond act II -Second Season-', 2],
    ['Diamond no Ace act II', 1],
    ['Mobile Suit Gundam: Iron-Blooded Orphans', 1],
    ['Spy x Family', 1],
  ])('%s → %i', (title, expected) => {
    expect(seasonNumber(title)).toBe(expected);
  });
});

describe('withoutSeason', () => {
  it.each([
    ['Mushoku Tensei: Jobless Reincarnation Season 2 Part 2', 'Mushoku Tensei: Jobless Reincarnation'],
    ['Tensei Shitara Slime Datta Ken 4th Season Part 1 & 2', 'Tensei Shitara Slime Datta Ken'],
    ['Mushoku Tensei III: Isekai Ittara Honki Dasu', 'Mushoku Tensei: Isekai Ittara Honki Dasu'],
    ['Black Clover 2nd Season', 'Black Clover'],
  ])('%s → %s', (title, expected) => {
    expect(withoutSeason(title)).toBe(expected);
  });
});

describe('releaseTitleVariants', () => {
  it('names a season without its parts, as release groups do (Slime "4th Season Part 1 & 2")', () => {
    const slimeS4 = {
      romajiTitle: 'Tensei Shitara Slime Datta Ken 4th Season Part 1 & 2',
      title: 'That Time I Got Reincarnated as a Slime Season 4',
    };

    const variants = releaseTitleVariants(slimeS4);

    expect(variants).toContain('Tensei Shitara Slime Datta Ken 4th Season');
    expect(variants).toContain('Tensei Shitara Slime Datta Ken S4');
    expect(variants).toContain('That Time I Got Reincarnated as a Slime S4');
  });

  it('includes the short name with the season, as SubsPlease names it', () => {
    const mushokuS3 = {
      romajiTitle: 'Mushoku Tensei III: Isekai Ittara Honki Dasu',
      title: 'Mushoku Tensei: Jobless Reincarnation Season 3',
    };

    expect(seriesSeason(mushokuS3)).toBe(3);
    expect(releaseTitleVariants(mushokuS3)).toContain('Mushoku Tensei S3');

    const mushokuS2Part2 = {
      romajiTitle: 'Mushoku Tensei II: Isekai Ittara Honki Dasu Part 2',
      title: 'Mushoku Tensei: Jobless Reincarnation Season 2 Part 2',
    };

    expect(releaseTitleVariants(mushokuS2Part2)).toContain('Mushoku Tensei S2');
  });

  it('names seasons spelled out in words, and uses alternative titles', () => {
    const aceS2 = {
      romajiTitle: 'Diamond no Ace act II: Second Season Part 2',
      title: 'Ace of the Diamond act II -Second Season-',
    };

    expect(releaseTitleVariants(aceS2)).toContain('Ace of the Diamond act II S2');

    const saikyo = {
      romajiTitle: 'Mezametara Saikyou Soubi to …',
      title: 'Reborn as a Space Mercenary',
      synonyms: ['Saikyosoubi'],
    };

    expect(releaseTitleVariants(saikyo)).toContain('Saikyosoubi');
  });

  it('keeps the existing spellings', () => {
    const frierenS2 = { romajiTitle: 'Sousou no Frieren 2nd Season', title: 'Frieren: Beyond Journey’s End Season 2' };

    expect(releaseTitleVariants(frierenS2)).toEqual(
      expect.arrayContaining(['Sousou no Frieren 2nd Season', 'Sousou no Frieren S2']),
    );
  });
});

describe('displayTitle', () => {
  const frieren = {
    title: 'Frieren: Beyond Journey’s End',
    englishTitle: 'Frieren: Beyond Journey’s End',
    romajiTitle: 'Sousou no Frieren',
    nativeTitle: '葬送のフリーレン',
  };

  const romajiOnly = { title: 'Yuruyuru Zukan', englishTitle: null, romajiTitle: 'Yuruyuru Zukan', nativeTitle: '' };

  it('shows the chosen language', () => {
    expect(displayTitle(frieren, 'english')).toBe('Frieren: Beyond Journey’s End');
    expect(displayTitle(frieren, 'romaji')).toBe('Sousou no Frieren');
    expect(displayTitle(frieren, 'native')).toBe('葬送のフリーレン');
  });

  it('falls back to romaji when a title has no English or Japanese one', () => {
    expect(displayTitle(romajiOnly, 'english')).toBe('Yuruyuru Zukan');
    expect(displayTitle(romajiOnly, 'native')).toBe('Yuruyuru Zukan');
  });

  it('lists the other titles without repeats', () => {
    expect(otherTitles(frieren, 'native')).toEqual(['Frieren: Beyond Journey’s End', 'Sousou no Frieren']);
    expect(otherTitles(romajiOnly, 'english')).toEqual([]);
  });
});

describe('genresToExclude', () => {
  it('always leaves out Hentai, and Ecchi when the filter is on', () => {
    expect(genresToExclude(false)).toEqual(['Hentai']);
    expect(genresToExclude(true)).toEqual(['Hentai', 'Ecchi']);
  });
});

describe('markedSeason', () => {
  it.each([
    ['[SubsPlease] Mushoku Tensei S2 - 13 (1080p)', 2],
    ['That Time I Got Reincarnated as a Slime S04E24 The Hero Awakens 1080p', 4],
    ['Solo Leveling - S01E11 (WEB 1080p)', 1],
    ['Kusuriya no Hitorigoto 3rd Season - 05', 3],
    ['[SubsPlease] Sousou no Frieren - 08 (1080p)', null],
  ])('%s → %s', (title, season) => {
    expect(markedSeason(title)).toBe(season);
  });
});
