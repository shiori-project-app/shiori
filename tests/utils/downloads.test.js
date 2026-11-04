import { describe, expect, it } from 'vitest';
import { episodeFileName } from '@/utils/downloads';
import { MAX_NAME_LENGTH, safeName } from '@shared/fileNames';
import { isVideoFileName } from '@shared/videoFiles';

const LONG_TITLE = 'A Very Long Light Novel Title '.repeat(6);

describe('episodeFileName', () => {
  it('names an episode after its show', () => {
    expect(episodeFileName({ title: 'Frieren' }, 5)).toBe('Frieren - 05.mp4');
  });

  it('shortens a long title but keeps the episode number and extension', () => {
    const firstEpisode = safeName(episodeFileName({ title: LONG_TITLE }, 1));
    const secondEpisode = safeName(episodeFileName({ title: LONG_TITLE }, 2));

    expect(firstEpisode.length).toBeLessThanOrEqual(MAX_NAME_LENGTH);
    expect(firstEpisode.endsWith(' - 01.mp4')).toBe(true);
    expect(isVideoFileName(firstEpisode)).toBe(true);
    expect(secondEpisode).not.toBe(firstEpisode);
  });

  it('starts with the same name as the show folder', () => {
    const title = 'Mob Psycho: 100?';

    expect(episodeFileName({ title }, 1).startsWith(`${safeName(title)} - `)).toBe(true);
  });
});
