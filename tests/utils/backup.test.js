import { describe, expect, it } from 'vitest';
import { createBackup, parseBackup } from '@/utils/backup';
import { toMalXml } from '@/utils/malExport';

const data = {
  list: { 1: { status: 'watching' }, 2: { status: 'completed' } },
  watched: { 1: [1, 2, 3] },
  watchDates: { '1-3': 1790000000000 },
  history: ['1-3', '1-2'],
  notes: { '1-3': [{ text: 'great fight' }, { text: 'rewatch' }] },
  tracking: { 1: { source: 'subsplease' } },
  appearance: { theme: 'mocha' },
};

describe('backups', () => {
  it('round-trips everything and summarises it', () => {
    const restored = parseBackup(createBackup(data, new Date('2026-11-01T10:00:00Z')));

    expect(restored.data).toEqual(data);
    expect(restored.exportedAt).toBe('2026-11-01T10:00:00.000Z');
    expect(restored.summary).toEqual({ list: 2, watchedShows: 1, history: 2, notes: 2, tracked: 1 });
  });

  it('rejects files that are not Shiori backups', () => {
    expect(() => parseBackup('not json')).toThrow(/valid JSON/);
    expect(() => parseBackup(JSON.stringify({ list: {} }))).toThrow(/isn’t a Shiori backup/);
    expect(() => parseBackup(JSON.stringify({ app: 'Shiori', format: 99, data: {} }))).toThrow(/newer version/);
  });

  it.each([
    ['history', {}],
    ['history', [1, 2]],
    ['list', 'not a list'],
    ['watched', { 1: 'not episodes' }],
    ['progress', { 'a-1': 'soon' }],
  ])('refuses a damaged backup with bad %s instead of restoring it', (key, value) => {
    const text = createBackup({ ...data, [key]: value });

    expect(() => parseBackup(text)).toThrow(new RegExp(`damaged.*${key}`));
  });

  it('drops keys that are not plain storage names', () => {
    const text = JSON.stringify({ app: 'Shiori', format: 1, data: { list: {}, 'bad key': 1, '../x': 2 } });

    expect(Object.keys(parseBackup(text).data)).toEqual(['list']);
  });
});

describe('toMalXml', () => {
  const series = (id, malId, extra = {}) => ({ id, malId, title: `Show ${id}`, romajiTitle: `Show ${id}`, ...extra });

  it('maps statuses and progress, and skips titles without a MyAnimeList id', () => {
    const { xml, count, skipped } = toMalXml([
      { series: series(1, 101), status: 'watching', watched: [1, 2, 5] },
      { series: series(2, 102, { totalEpisodes: 12 }), status: 'completed', watched: [] },
      { series: series(3, 103), status: 'paused' },
      { series: series(4, null, { title: 'AniList only' }), status: 'planning' },
    ]);

    expect(count).toBe(3);
    expect(skipped).toEqual(['AniList only']);
    expect(xml).toContain('<series_animedb_id>101</series_animedb_id>');

    expect(xml).toMatch(
      /101<\/series_animedb_id>[\s\S]*?<my_watched_episodes>5<\/my_watched_episodes>[\s\S]*?Watching/,
    );

    expect(xml).toMatch(
      /102<\/series_animedb_id>[\s\S]*?<my_watched_episodes>12<\/my_watched_episodes>[\s\S]*?Completed/,
    );

    expect(xml).toMatch(/103<\/series_animedb_id>[\s\S]*?<my_watched_episodes>0<\/my_watched_episodes>[\s\S]*?On-Hold/);
    expect(xml).toContain('<user_total_anime>3</user_total_anime>');
  });

  it('escapes titles', () => {
    const { xml } = toMalXml([{ series: series(1, 1, { romajiTitle: 'Tom & Jerry <3 "x"' }), status: 'watching' }]);

    expect(xml).toContain('<series_title>Tom &amp; Jerry &lt;3 &quot;x&quot;</series_title>');
  });
});
