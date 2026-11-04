import { describe, expect, it } from 'vitest';
import { collapsedWindow, orderFranchise, seriesWatchProgress } from '@/utils/watchOrder';

const S1 = 10;
const MOVIE = 30;
const S2 = 20;
const OVA = 40;
const RECAP = 50;

const graph = new Map([
  [
    S1,

    [
      { type: 'SEQUEL', id: MOVIE },
      { type: 'SIDE_STORY', id: OVA },
    ],
  ],

  [
    MOVIE,

    [
      { type: 'PREQUEL', id: S1 },
      { type: 'SEQUEL', id: S2 },
    ],
  ],

  [
    S2,

    [
      { type: 'PREQUEL', id: MOVIE },
      { type: 'SUMMARY', id: RECAP },
    ],
  ],

  [OVA, [{ type: 'PARENT', id: S1 }]],
  [RECAP, [{ type: 'PARENT', id: S2 }]],
]);

const released = { [S1]: 20190406, [OVA]: 20191010, [MOVIE]: 20201016, [RECAP]: 20211201, [S2]: 20211205 };

const releaseKey = (id) => released[id];

describe('orderFranchise', () => {
  it('lists every title in release order', () => {
    expect(orderFranchise(graph, S2, releaseKey).map((entry) => entry.id)).toEqual([S1, OVA, MOVIE, RECAP, S2]);
  });

  it('marks the prequel/sequel chain as the main story, movies included', () => {
    const main = orderFranchise(graph, S1, releaseKey)
      .filter((entry) => entry.main)
      .map((entry) => entry.id);

    expect(main).toEqual([S1, MOVIE, S2]);
  });

  it('labels the other titles by how they connect', () => {
    const byId = Object.fromEntries(orderFranchise(graph, S1, releaseKey).map((entry) => [entry.id, entry]));

    expect(byId[OVA]).toMatchObject({ main: false, relation: 'SIDE_STORY' });
    expect(byId[RECAP]).toMatchObject({ main: false, relation: 'SUMMARY' });
    expect(byId[MOVIE].relation).toBeNull();
  });

  it('finds the main story through the parent when viewing a side story', () => {
    const main = orderFranchise(graph, OVA, releaseKey)
      .filter((entry) => entry.main)
      .map((entry) => entry.id);

    expect(main).toEqual([S1, MOVIE, S2]);
  });

  it('puts titles without a date last', () => {
    const withUnknown = new Map([...graph, [99, [{ type: 'PREQUEL', id: S2 }]]]);

    const key = (id) => released[id] ?? Number.MAX_SAFE_INTEGER;

    expect(orderFranchise(withUnknown, S1, key).at(-1)).toMatchObject({ id: 99 });
  });

  it('follows a sequel that only the later title records', () => {
    const withOneSidedSequel = new Map([...graph, [99, [{ type: 'PREQUEL', id: S2 }]]]);

    const main = orderFranchise(withOneSidedSequel, S1, (id) => released[id] ?? Number.MAX_SAFE_INTEGER)
      .filter((entry) => entry.main)
      .map((entry) => entry.id);

    expect(main).toEqual([S1, MOVIE, S2, 99]);
  });

  it('finds the main story from a title whose own relations point nowhere in the franchise', () => {
    const withOneSidedMovie = new Map([...graph, [MOVIE, []]]);

    const main = orderFranchise(withOneSidedMovie, MOVIE, releaseKey)
      .filter((entry) => entry.main)
      .map((entry) => entry.id);

    expect(main).toEqual([S1, MOVIE, S2]);
  });

  it('finds the parent of a side story that only the parent records', () => {
    const withOneSidedOva = new Map([...graph, [OVA, []]]);

    const main = orderFranchise(withOneSidedOva, OVA, releaseKey)
      .filter((entry) => entry.main)
      .map((entry) => entry.id);

    expect(main).toEqual([S1, MOVIE, S2]);
  });
});

describe('seriesWatchProgress', () => {
  const watchedUpTo = (count) => ({ 7: Array.from({ length: count }, (_, index) => index + 1) });

  it('doesn’t call an airing show with an unknown total finished when every released episode is watched', () => {
    const airing = { id: 7, totalEpisodes: null, released: 5 };

    expect(seriesWatchProgress(airing, {}, watchedUpTo(5))).toEqual({
      watchedEpisodes: 5,
      totalEpisodes: 5,
      isCompleted: false,
    });
  });

  it('calls a show finished once every episode of a known total is watched', () => {
    expect(seriesWatchProgress({ id: 7, totalEpisodes: 12 }, {}, watchedUpTo(12)).isCompleted).toBe(true);
  });

  it('trusts a completed status in My List', () => {
    const airing = { id: 7, totalEpisodes: null, released: 5 };

    expect(seriesWatchProgress(airing, { 7: { status: 'completed' } }, {}).isCompleted).toBe(true);
  });
});

describe('collapsedWindow', () => {
  it('shows the first five when the current show is near the start', () => {
    expect(collapsedWindow(12, 0, 5)).toEqual({ start: 0, end: 5 });
    expect(collapsedWindow(12, 3, 5)).toEqual({ start: 0, end: 5 });
  });

  it('slides to keep the current show visible, with the next title after it', () => {
    expect(collapsedWindow(12, 8, 5)).toEqual({ start: 5, end: 10 });
  });

  it('never runs past the end, and handles short lists and a hidden current show', () => {
    expect(collapsedWindow(12, 11, 5)).toEqual({ start: 7, end: 12 });
    expect(collapsedWindow(3, 2, 5)).toEqual({ start: 0, end: 3 });
    expect(collapsedWindow(12, -1, 5)).toEqual({ start: 0, end: 5 });
  });
});
