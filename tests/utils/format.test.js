import { describe, expect, it } from 'vitest';
import { formatResolution } from '@/utils/format';

describe('formatResolution', () => {
  it.each([
    [3840, 2160, '2160p'],
    [2560, 1440, '1440p'],
    [1920, 1080, '1080p'],
    [1280, 720, '720p'],
    [1600, 900, '900p'],
    [1024, 576, '576p'],
    [720, 576, '576p'],
    [960, 540, '540p'],
    [720, 540, '540p'],
    [854, 480, '480p'],
    [848, 480, '480p'],
    [720, 480, '480p'],
    [640, 360, '360p'],
    [426, 240, '240p'],
  ])('names %i×%i as %s', (width, height, label) => {
    expect(formatResolution({ width, height })).toBe(label);
  });

  it.each([
    [1920, 800, '1080p'],
    [1920, 1038, '1080p'],
    [1440, 1080, '1080p'],
    [1280, 536, '720p'],
    [960, 720, '720p'],
  ])('names a cropped or narrow %i×%i by its tier: %s', (width, height, label) => {
    expect(formatResolution({ width, height })).toBe(label);
  });

  it('falls back to the frame’s own height when its width matches no standard size', () => {
    expect(formatResolution({ width: 3440, height: 1440 })).toBe('1440p');
  });

  it('reads a wide frame by its width first, because cropped films are common and ultrawide anime isn’t', () => {
    expect(formatResolution({ width: 1280, height: 536 })).toBe('720p');
    expect(formatResolution({ width: 2560, height: 1080 })).toBe('1440p');
  });

  it('snaps sizes just off a standard height', () => {
    expect(formatResolution({ width: 1916, height: 1076 })).toBe('1080p');
    expect(formatResolution({ width: 1272, height: 716 })).toBe('720p');
  });

  it('names an unusual size by its own height rather than a lower tier', () => {
    expect(formatResolution({ width: 1706, height: 960 })).toBe('960p');
    expect(formatResolution({ width: 256, height: 144 })).toBe('144p');
  });

  it.each([[undefined], [null]])('is empty when the resolution is %s', (resolution) => {
    expect(formatResolution(resolution)).toBe('');
  });
});
