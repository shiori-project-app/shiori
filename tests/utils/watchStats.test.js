import { describe, expect, it } from 'vitest';
import { formatHours } from '@/utils/format';
import { episodesPerMonth, topGenres, watchStats } from '@/utils/watchStats';

const TWENTY_FOUR_MINUTES = 24 * 60;
const TWO_HOURS = 2 * 60 * 60;

const seriesById = (seriesId) =>
  ({
    1: { id: 1, duration: TWENTY_FOUR_MINUTES, genres: ['Action', 'Fantasy'] },
    2: { id: 2, duration: TWO_HOURS, genres: ['Drama', 'Fantasy'] },
    3: { id: 3, duration: TWENTY_FOUR_MINUTES, genres: ['Action', 'Comedy'] },
  })[seriesId];

const localTime = (year, monthIndex, day) => new Date(year, monthIndex, day, 12).getTime();

describe('watchStats', () => {
  const watched = { 1: [1, 2, 3, 4, 5], 2: [1], 3: [1], 404: [1, 2] };

  it('adds up hours from each show’s episode length, skipping shows that couldn’t be loaded', () => {
    const stats = watchStats({ watched, watchDates: {}, seriesById, genreCount: 8, monthCount: 12 });

    expect(stats.secondsWatched).toBe(5 * TWENTY_FOUR_MINUTES + TWO_HOURS + TWENTY_FOUR_MINUTES);
  });

  it('still counts every watched episode and show, loaded or not', () => {
    const stats = watchStats({ watched, watchDates: {}, seriesById, genreCount: 8, monthCount: 12 });

    expect(stats).toMatchObject({ episodeCount: 9, showCount: 4, hasWatchDates: false });
  });
});

describe('watchStats with a very large library', () => {
  const SHOW_COUNT = 5000;
  const EPISODES_PER_SHOW = 24;

  const TIME_BUDGET_MS = 500;
  const GENRES = ['Action', 'Comedy', 'Drama', 'Fantasy', 'Horror', 'Romance', 'Sci-Fi', 'Sports'];

  const now = localTime(2026, 10, 3);
  const episodeNumbers = Array.from({ length: EPISODES_PER_SHOW }, (_, index) => index + 1);

  const showIds = Array.from({ length: SHOW_COUNT }, (_, index) => index + 1);

  const seriesByShowId = new Map(
    showIds.map((showId) => [
      showId,
      { id: showId, duration: TWENTY_FOUR_MINUTES, genres: [GENRES[showId % 8], GENRES[(showId + 3) % 8]] },
    ]),
  );

  const watched = Object.fromEntries(showIds.map((showId) => [showId, episodeNumbers]));

  const watchDates = Object.fromEntries(
    showIds.flatMap((showId) =>
      episodeNumbers.map((episodeNumber) => [`${showId}-${episodeNumber}`, now - showId * episodeNumber * 3600000]),
    ),
  );

  it('adds up 120,000 episodes across 5,000 shows within the time budget', () => {
    const startedAt = performance.now();

    const stats = watchStats({
      watched,
      watchDates,
      seriesById: (showId) => seriesByShowId.get(showId),
      genreCount: 8,
      monthCount: 12,
      now,
    });

    expect(performance.now() - startedAt).toBeLessThan(TIME_BUDGET_MS);
    expect(stats).toMatchObject({ episodeCount: SHOW_COUNT * EPISODES_PER_SHOW, showCount: SHOW_COUNT });
    expect(stats.genres).toHaveLength(8);
  });
});

describe('topGenres', () => {
  const entries = [1, 2, 3].map((seriesId) => ({ series: seriesById(seriesId), episodes: 1 }));

  it('ranks genres by how many watched shows carry them, then by name', () => {
    expect(topGenres(entries, 3)).toEqual([
      { genre: 'Action', showCount: 2 },
      { genre: 'Fantasy', showCount: 2 },
      { genre: 'Comedy', showCount: 1 },
    ]);
  });
});

describe('episodesPerMonth', () => {
  const now = localTime(2026, 10, 3);

  it('lists the last months oldest first, with empty months as zero', () => {
    const months = episodesPerMonth({}, 3, now);

    expect(months.map((month) => month.month)).toEqual(['2026-09', '2026-10', '2026-11']);
    expect(months.every((month) => month.episodes === 0)).toBe(true);
  });

  it('counts episodes into the month they were watched in, across a year boundary', () => {
    const watchDates = {
      '1-1': localTime(2026, 10, 1),
      '1-2': localTime(2026, 10, 2),
      '1-3': localTime(2026, 0, 31),
      '1-4': localTime(2025, 11, 31),
      '1-5': localTime(2025, 10, 30),
    };

    const months = episodesPerMonth(watchDates, 12, now);

    const episodesIn = (month) => months.find((entry) => entry.month === month)?.episodes;

    expect(episodesIn('2026-11')).toBe(2);
    expect(episodesIn('2026-01')).toBe(1);
    expect(episodesIn('2025-12')).toBe(1);
    expect(episodesIn('2025-11')).toBeUndefined();
  });
});

describe('formatHours', () => {
  it('shows one decimal under ten hours and whole hours above', () => {
    expect(formatHours(TWENTY_FOUR_MINUTES * 5)).toBe('2.0');
    expect(formatHours(TWO_HOURS * 6.3)).toBe('13');
  });
});
