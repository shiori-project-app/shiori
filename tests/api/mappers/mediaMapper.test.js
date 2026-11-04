import { describe, expect, it } from 'vitest';
import { mapMedia, parseStreamingEpisodes } from '@/api/mappers/mediaMapper';

const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

const list = (numbers) => numbers.map((n) => ({ title: `Episode ${n} - Title ${n}`, thumbnail: `thumb-${n}.jpg` }));

describe('parseStreamingEpisodes', () => {
  it('maps "Episode 3 - Name" to episode 3', () => {
    expect(parseStreamingEpisodes(list([1, 2, 3]), 12)).toEqual({
      1: { title: 'Title 1', thumb: 'thumb-1.jpg' },
      2: { title: 'Title 2', thumb: 'thumb-2.jpg' },
      3: { title: 'Title 3', thumb: 'thumb-3.jpg' },
    });
  });

  it('renumbers a later season listed with continued numbers (Solo Leveling S2: 13–25 → 1–13)', () => {
    const episodes = parseStreamingEpisodes(list(range(13, 25).reverse()), 13, { laterSeason: true });

    expect(episodes[1]).toEqual({ title: 'Title 13', thumb: 'thumb-13.jpg' });
    expect(episodes[2].title).toBe('Title 14');
    expect(episodes[13].title).toBe('Title 25');
    expect(episodes[25]).toBeUndefined();
  });

  it('renumbers an airing season too (5 of 13 out so far, numbered 13–17)', () => {
    expect(Object.keys(parseStreamingEpisodes(list([13, 14, 15, 16, 17]), 5, { laterSeason: true }))).toEqual([
      '1',
      '2',
      '3',
      '4',
      '5',
    ]);
  });

  it('leaves a season alone when only its first episodes are missing', () => {
    expect(Object.keys(parseStreamingEpisodes(list([5, 6, 12]), 12))).toEqual(['5', '6', '12']);
  });

  it('ignores a list that belongs to another season (Solo Leveling S1, 12 episodes, has S2’s list 13–25)', () => {
    expect(parseStreamingEpisodes(list(range(13, 25)), 12, { laterSeason: false })).toEqual({});
  });

  it('never renumbers a first season (Slime S1, 24 episodes, carries S3’s 49–72)', () => {
    expect(parseStreamingEpisodes(list(range(49, 72)), 24)).toEqual({});
    expect(parseStreamingEpisodes(list(range(49, 72)), 24, { laterSeason: true })[1].title).toBe('Title 49');
  });

  it('ignores a list covering more than this season (Attack on Titan S2: 1–25 for 12 episodes)', () => {
    expect(parseStreamingEpisodes(list(range(1, 25)), 12)).toEqual({});
  });

  it('ignores a list shared by two parts (Re:Zero S2 Part 1: 51–66 for 13 episodes)', () => {
    expect(parseStreamingEpisodes(list(range(51, 66)), 13)).toEqual({});
  });

  it('keeps a list with one bonus entry, without the bonus (Konosuba: 1–11 for 10 episodes)', () => {
    expect(Object.keys(parseStreamingEpisodes(list(range(1, 11)), 10))).toEqual(range(1, 10).map(String));
  });

  it('keeps a long-running show’s partial list as it is (One Piece: 62–130 of 1180)', () => {
    expect(Object.keys(parseStreamingEpisodes(list([62, 63, 130]), 1180))).toEqual(['62', '63', '130']);
  });

  it('leaves the numbers alone when the episode count is unknown', () => {
    expect(Object.keys(parseStreamingEpisodes(list([13, 14]), null))).toEqual(['13', '14']);
  });
});

describe('mapMedia watch order flag', () => {
  const media = (edges) => ({
    id: 1,
    title: { english: 'Show', romaji: 'Show' },
    status: 'FINISHED',
    episodes: 12,
    studios: { nodes: [] },
    coverImage: {},
    relations: { edges },
  });

  const edge = (relationType, type = 'ANIME', format = 'TV') => ({ relationType, node: { type, format } });

  it('knows up front whether a show has a watch order', () => {
    expect(mapMedia(media([edge('SEQUEL')])).hasWatchOrder).toBe(true);
    expect(mapMedia(media([edge('SIDE_STORY', 'ANIME', 'OVA')])).hasWatchOrder).toBe(true);
    expect(mapMedia(media([edge('ADAPTATION', 'MANGA')])).hasWatchOrder).toBe(false);
    expect(mapMedia(media([edge('SEQUEL', 'MANGA')])).hasWatchOrder).toBe(false);
    expect(mapMedia(media([edge('PREQUEL', 'ANIME', 'MUSIC')])).hasWatchOrder).toBe(false);
    expect(mapMedia(media([])).hasWatchOrder).toBe(false);
  });
});
