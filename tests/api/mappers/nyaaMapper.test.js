import { describe, expect, it } from 'vitest';
import { parseNyaaRss } from '@/api/mappers/nyaaMapper';
import { NYAA_RSS } from '../../fixtures/nyaa';

describe('parseNyaaRss', () => {
  const [trustedRelease, dualAudioRelease, ...rest] = parseNyaaRss(NYAA_RSS);

  it('reads every field of a release', () => {
    expect(trustedRelease).toMatchObject({
      id: '0123456789abcdef0123456789abcdef01234567',
      title: '[SubsPlease] Sousou no Frieren - 08 (1080p) [C8B6130B].mkv',
      size: '1.4 GiB',
      seeders: 1520,
      leechers: 34,
      trusted: true,
      pageUrl: 'https://nyaa.si/view/1',
      resolution: '1080',
      publishedAt: Date.parse('Fri, 27 Oct 2023 16:31:02 -0000'),
    });

    expect(trustedRelease.magnet).toMatch(/^magnet:\?xt=urn:btih:0123456789abcdef0123456789abcdef01234567&dn=/);
    expect(trustedRelease.magnet).toContain('&tr=');
  });

  it('tolerates bad numbers and dates', () => {
    expect(dualAudioRelease).toMatchObject({ seeders: 0, trusted: false, resolution: '720', publishedAt: null });
  });

  it('skips items without an info hash', () => {
    expect(rest).toEqual([]);
  });
});
