import { describe, expect, it } from 'vitest';
import { releaseEpisodes } from '@/utils/releaseEpisodes';

const releaseEpisode = (series, release, context = {}, now = Date.now()) =>
  releaseEpisodes(series, [{ ...release, id: 0 }], context, now).get(0);

const day = (date) => Date.parse(`${date}T12:00:00Z`);

const NOW = day('2026-11-01');

const soloS1 = {
  title: 'Solo Leveling',
  romajiTitle: 'Ore dake Level Up na Ken',
  totalEpisodes: 12,
  released: 12,
  startedAt: day('2024-01-07'),
  endedAt: day('2024-03-31'),
  hasSequel: true,
};

const soloS2 = {
  title: 'Solo Leveling Season 2 -Arise from the Shadow-',
  romajiTitle: 'Ore dake Level Up na Ken: Season 2 - Arise from the Shadow',
  totalEpisodes: 13,
  released: 13,
  startedAt: day('2025-01-05'),
  endedAt: day('2025-03-30'),
  hasPrequel: true,
};

const soloS2Context = { offset: 12, sameSeasonOffset: 0 };

const mushokuS2P2 = {
  title: 'Mushoku Tensei: Jobless Reincarnation Season 2 Part 2',
  romajiTitle: 'Mushoku Tensei II: Isekai Ittara Honki Dasu Part 2',
  totalEpisodes: 12,
  released: 12,
  startedAt: day('2024-04-08'),
  endedAt: day('2024-06-24'),
  hasPrequel: true,
  hasSequel: true,
};

const mushokuContext = { offset: 35, sameSeasonOffset: 12 };

const kaguyaS3 = {
  title: 'Kaguya-sama: Love is War -Ultra Romantic-',
  romajiTitle: 'Kaguya-sama wa Kokurasetai: Ultra Romantic',
  totalEpisodes: 13,
  released: 13,
  startedAt: day('2022-04-09'),
  endedAt: day('2022-06-25'),
  hasPrequel: true,
};

const kaguyaContext = { offset: 24, sameSeasonOffset: 0 };

const release = (title, date) => ({ title, publishedAt: day(date) });

describe('releaseEpisode', () => {
  it('reads continued numbering of a later season ("Solo Leveling - 23" = Season 2 episode 11)', () => {
    expect(
      releaseEpisode(
        soloS2,
        release('[SubsPlease] Solo Leveling - 23 (1080p) [ABCD1234].mkv', '2025-03-15'),
        soloS2Context,
        NOW,
      ),
    ).toBe(11);
  });

  it('takes a release naming the right season', () => {
    expect(
      releaseEpisode(
        soloS2,
        release('[Erai-raws] Ore dake Level Up na Ken Season 2 - 11 [1080p].mkv', '2025-03-15'),
        soloS2Context,
        NOW,
      ),
    ).toBe(11);
  });

  it('rejects a season 1 release with the same number for season 2', () => {
    expect(
      releaseEpisode(
        soloS2,
        release('[SubsPlease] Solo Leveling - 11 (1080p) [EFGH5678].mkv', '2024-03-23'),
        soloS2Context,
        NOW,
      ),
    ).toBeNull();

    expect(
      releaseEpisode(
        soloS2,
        release('[Group] Ore dake Level Up na Ken S1 - 11 [1080p].mkv', '2025-03-15'),
        soloS2Context,
        NOW,
      ),
    ).toBeNull();
  });

  it('rejects a season 2 release for season 1', () => {
    expect(
      releaseEpisode(
        soloS1,
        release('[Erai-raws] Ore dake Level Up na Ken Season 2 - 05 [1080p].mkv', '2025-02-01'),
        {},
        NOW,
      ),
    ).toBeNull();

    expect(releaseEpisode(soloS1, release('[Group] Solo Leveling - 05 [1080p].mkv', '2025-02-01'), {}, NOW)).toBeNull();
  });

  it('takes season 1 releases for season 1', () => {
    expect(releaseEpisode(soloS1, release('[SubsPlease] Solo Leveling - 05 (1080p).mkv', '2024-02-04'), {}, NOW)).toBe(
      5,
    );
  });

  it('reads numbering continued across parts of one season ("S2 - 13" = Part 2 episode 1)', () => {
    expect(
      releaseEpisode(
        mushokuS2P2,
        release('[SubsPlease] Mushoku Tensei S2 - 13 (1080p).mkv', '2024-04-08'),
        mushokuContext,
        NOW,
      ),
    ).toBe(1);

    expect(
      releaseEpisode(
        mushokuS2P2,
        release('[SubsPlease] Mushoku Tensei S2 - 24 (1080p).mkv', '2024-06-24'),
        mushokuContext,
        NOW,
      ),
    ).toBe(12);
  });

  it('rejects another season’s release for a later season whose title has no number', () => {
    expect(
      releaseEpisode(
        kaguyaS3,
        release('[Group] Kaguya-sama wa Kokurasetai S1 - 05 [1080p].mkv', '2022-05-01'),
        kaguyaContext,
        NOW,
      ),
    ).toBeNull();

    expect(
      releaseEpisode(
        kaguyaS3,
        release('[HorribleSubs] Kaguya-sama wa Kokurasetai - 05 [1080p].mkv', '2019-02-09'),
        kaguyaContext,
        NOW,
      ),
    ).toBeNull();

    expect(
      releaseEpisode(
        kaguyaS3,
        release('[SubsPlease] Kaguya-sama wa Kokurasetai S3 - 05 (1080p).mkv', '2022-05-07'),
        kaguyaContext,
        NOW,
      ),
    ).toBe(5);
  });

  it('rejects numbers beyond the season and releases without a number', () => {
    expect(
      releaseEpisode(soloS2, release('[SubsPlease] Solo Leveling - 40 (1080p).mkv', '2025-03-15'), soloS2Context, NOW),
    ).toBeNull();

    expect(
      releaseEpisode(
        soloS2,
        release('[Group] Solo Leveling Season 2 (Batch) [1080p]', '2025-04-01'),
        soloS2Context,
        NOW,
      ),
    ).toBeNull();
  });

  it('accepts any plain release of a show with only one season', () => {
    const single = {
      title: 'Frieren',
      romajiTitle: 'Sousou no Frieren',
      totalEpisodes: 28,
      released: 28,
      startedAt: day('2023-09-29'),
    };

    expect(releaseEpisode(single, release('[Group] Sousou no Frieren - 08 [1080p].mkv', '2030-01-01'), {}, NOW)).toBe(
      8,
    );
  });

  it('rejects an earlier part’s release that names the same season ("S2 - 01" of Part 1 for Part 2)', () => {
    expect(
      releaseEpisode(
        mushokuS2P2,
        release('[SubsPlease] Mushoku Tensei S2 - 01 (1080p).mkv', '2023-07-09'),
        mushokuContext,
        NOW,
      ),
    ).toBeNull();
  });
});

describe('releaseEpisodes', () => {
  const schedule = { 1: day('2024-04-07'), 2: day('2024-04-14'), 3: day('2024-04-21') };
  const context = { offset: 36, sameSeasonOffset: 13, schedule };

  const releases = [
    { id: 'a', ...release('[SubsPlease] Mushoku Tensei S2 - 13 (1080p).mkv', '2024-04-07') },
    { id: 'b', ...release('[SubsPlease] Mushoku Tensei S2 - 14 (1080p).mkv', '2024-04-14') },
    { id: 'c', ...release('[Dub] Mushoku Tensei S2 - 14 [English Dub] [1080p].mkv', '2024-05-20') },
    { id: 'd', ...release('[SubsPlease] Mushoku Tensei S2 - 01 (1080p).mkv', '2023-07-09') },
  ];

  it('corrects an off-by-one shift from releases that came out as their episode aired', () => {
    const episodes = releaseEpisodes(mushokuS2P2, releases, context, NOW);

    expect(Object.fromEntries(episodes)).toEqual({ a: 1, b: 2, c: 2, d: null });
  });

  it('keeps the shift when the schedule agrees with it', () => {
    const exact = { ...context, sameSeasonOffset: 12 };

    expect(Object.fromEntries(releaseEpisodes(mushokuS2P2, releases, exact, NOW))).toEqual({
      a: 1,
      b: 2,
      c: 2,
      d: null,
    });
  });

  it('keeps the shift without a schedule', () => {
    const noSchedule = { offset: 12, sameSeasonOffset: 0 };
    const solo = [{ id: 'x', ...release('[SubsPlease] Solo Leveling - 23 (1080p).mkv', '2025-03-15') }];

    expect(releaseEpisodes(soloS2, solo, noSchedule, NOW).get('x')).toBe(11);
  });
});
