import { describe, expect, it } from 'vitest';
import { compareSeasons, currentSeason, readSeason, seasonLabel, seasonStartDate, shiftSeason } from '@/utils/season';

describe('seasons', () => {
  it('finds the season of a date', () => {
    expect(currentSeason(new Date(2026, 0, 15))).toEqual({ season: 'WINTER', year: 2026 });
    expect(currentSeason(new Date(2026, 10, 1))).toEqual({ season: 'FALL', year: 2026 });
  });

  it('steps across years both ways', () => {
    expect(shiftSeason({ season: 'FALL', year: 2026 }, 1)).toEqual({ season: 'WINTER', year: 2027 });
    expect(shiftSeason({ season: 'WINTER', year: 2026 }, -1)).toEqual({ season: 'FALL', year: 2025 });
    expect(shiftSeason({ season: 'SPRING', year: 2026 }, -6)).toEqual({ season: 'FALL', year: 2024 });
  });

  it('reads URL params, falling back to the current season', () => {
    const now = new Date(2026, 10, 1);

    expect(readSeason(new URLSearchParams('season=SUMMER&year=2024'), now)).toEqual({ season: 'SUMMER', year: 2024 });
    expect(readSeason(new URLSearchParams('season=nope&year=2024'), now)).toEqual({ season: 'FALL', year: 2026 });
    expect(readSeason(new URLSearchParams(''), now)).toEqual({ season: 'FALL', year: 2026 });
  });

  it('gives the first day of a season as an AniList date', () => {
    expect(seasonStartDate({ season: 'WINTER', year: 2027 })).toBe(20270101);
    expect(seasonStartDate({ season: 'FALL', year: 2026 })).toBe(20261001);
  });

  it('compares seasons', () => {
    expect(compareSeasons({ season: 'FALL', year: 2026 }, { season: 'WINTER', year: 2027 })).toBeLessThan(0);
    expect(compareSeasons({ season: 'FALL', year: 2026 }, { season: 'FALL', year: 2026 })).toBe(0);
    expect(compareSeasons({ season: 'SPRING', year: 2027 }, { season: 'FALL', year: 2026 })).toBeGreaterThan(0);
  });

  it('labels a season', () => {
    expect(seasonLabel({ season: 'FALL', year: 2026 })).toBe('Fall 2026');
  });
});
