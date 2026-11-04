import { describe, expect, it } from 'vitest';
import { parseDownloadUrl, parseEpisodes, parseSearchResults } from '@/api/mappers/animeHeavenMapper';
import { EPISODES_HTML, GATE_HTML, GATE_WITHOUT_DOWNLOAD_HTML, SEARCH_RESULTS_HTML } from '../../fixtures/animeHeaven';

describe('animeHeavenMapper', () => {
  it('reads show codes and titles from search results', () => {
    expect(parseSearchResults(SEARCH_RESULTS_HTML)).toEqual([
      { code: 'abc12', title: "Frieren: Beyond Journey's End" },
      { code: 'def34', title: "Frieren: Beyond Journey's End Season 2" },
    ]);
  });

  it('reads numbered episodes with valid keys, oldest first', () => {
    expect(parseEpisodes(EPISODES_HTML)).toEqual([
      { episodeNumber: 1, key: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' },
      { episodeNumber: 2, key: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' },
    ]);
  });

  it('finds the download link, not the streaming one', () => {
    expect(parseDownloadUrl(GATE_HTML)).toBe('https://cdn.animeheaven.me/video.mp4?download=1');
    expect(parseDownloadUrl(GATE_WITHOUT_DOWNLOAD_HTML)).toBeNull();
  });
});
