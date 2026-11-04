import { describe, expect, it } from 'vitest';
import { alignReleases } from '@/api/services/subsPleaseService';

const at = (date) => Date.parse(date);

const single = (episodeNumber, date) => ({
  episodeNumber,
  from: episodeNumber,
  to: episodeNumber,
  isBatch: false,
  label: String(episodeNumber),
  releasedAt: at(date),
});

const batch = (from, to, date) => ({
  episodeNumber: null,
  from,
  to,
  isBatch: true,
  label: `${from}-${to}`,
  releasedAt: at(date),
});

describe('alignReleases', () => {
  it('renumbers a season that keeps counting from the previous one', () => {
    const blackCloverS2 = { startedAt: at('2026-10-04'), released: 4, totalEpisodes: null };

    const { offset, releases } = alignReleases(blackCloverS2, [
      single(174, '2026-10-25'),
      single(171, '2026-10-04'),
      batch(1, 170, '2021-04-07'),
      single(170, '2021-03-30'),
    ]);

    expect(offset).toBe(170);
    expect(releases.map((release) => release.episodeNumber)).toEqual([4, 1]);
  });

  it('renumbers the second cour of a split season', () => {
    const mushokuS2Part2 = { startedAt: at('2024-04-08'), released: 12, totalEpisodes: 12 };

    const { offset, releases } = alignReleases(mushokuS2Part2, [
      single(24, '2024-06-30'),
      single(13, '2024-04-08'),
      single(12, '2023-09-25'),
      batch(1, 24, '2026-10-27'),
    ]);

    expect(offset).toBe(12);
    expect(releases.filter((release) => !release.isBatch).map((release) => release.episodeNumber)).toEqual([12, 1]);
    expect(releases.find((release) => release.isBatch)).toMatchObject({ from: 1, to: 12 });
  });

  it('keeps only this season when a plain title is reused with numbering restarted', () => {
    const kusuriyaS3 = { startedAt: at('2026-10-03'), endedAt: null, released: 5, totalEpisodes: 24 };

    const { offset, releases } = alignReleases(kusuriyaS3, [
      single(5, '2026-10-31'),
      single(1, '2026-10-03'),
      batch(1, 24, '2024-04-01'),
      single(24, '2024-03-24'),
      single(1, '2023-10-22'),
    ]);

    expect(offset).toBe(0);

    expect(
      releases.map((release) => `${release.episodeNumber}@${new Date(release.releasedAt).getUTCFullYear()}`),
    ).toEqual(['5@2026', '1@2026']);
  });

  it('accepts a late release of a finished series, but not a later season', () => {
    const pawAndPalaces = { startedAt: at('2025-12-03'), endedAt: at('2026-03-04'), released: 16, totalEpisodes: 16 };
    const late = alignReleases(pawAndPalaces, [single(7, '2026-10-28'), single(4, '2026-10-10')]);

    expect(late.releases.map((release) => release.episodeNumber)).toEqual([7, 4]);

    const kusuriyaS1 = { startedAt: at('2023-10-22'), endedAt: at('2024-03-24'), released: 24, totalEpisodes: 24 };
    const laterSeason = alignReleases(kusuriyaS1, [single(53, '2026-10-30'), single(25, '2025-01-10')]);

    expect(laterSeason.releases).toEqual([]);
  });

  it('leaves a normal season alone', () => {
    const mushokuS3 = { startedAt: at('2026-07-05'), released: 14, totalEpisodes: 14 };

    expect(alignReleases(mushokuS3, [single(14, '2026-09-27'), single(1, '2026-07-05')]).offset).toBe(0);
  });

  it('never shifts a long single entry', () => {
    const onePiece = { startedAt: at('1999-10-20'), released: 1180, totalEpisodes: null };

    expect(alignReleases(onePiece, [single(1180, '2026-10-26'), single(1150, '2026-03-01')]).offset).toBe(0);
  });
});
