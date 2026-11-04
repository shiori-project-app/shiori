import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getSubtitles } from '@/api/clients/desktopClient';
import { useSubtitles } from '@/hooks/useSubtitles';
import { storage } from '@/utils/storage';

vi.mock('assjs', () => ({
  default: class {
    destroy = () => {};
  },
}));

vi.mock('@/api/clients/desktopClient', () => ({ getSubtitles: vi.fn() }));

const FILE = { path: 'Show\\Show - 01.mkv' };
const PREFERENCE_KEY = 'player-subtitles';

const styledTrack = (number, language) => ({ number, language, kind: 'ass', ass: '' });

const renderSubtitles = async (tracks) => {
  getSubtitles.mockResolvedValue(tracks);

  const video = document.createElement('video');
  const overlay = document.createElement('div');
  const rendered = renderHook(() => useSubtitles(FILE, { current: video }, { current: overlay }));

  await waitFor(() => expect(rendered.result.current.loading).toBe(false));

  return rendered.result;
};

describe('useSubtitles', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('does not turn subtitles off for later episodes when this file has none', async () => {
    const subtitles = await renderSubtitles([]);

    act(() => subtitles.current.toggle());
    act(() => subtitles.current.select(null));

    expect(storage.get(PREFERENCE_KEY, null)).toEqual({ off: false, language: null });
  });

  it('turns back on with the track that was in use, not the first one', async () => {
    const subtitles = await renderSubtitles([styledTrack(3, 'eng'), styledTrack(4, 'spa')]);

    act(() => subtitles.current.select(4));
    act(() => subtitles.current.toggle());
    expect(subtitles.current.current).toBeNull();
    expect(storage.get(PREFERENCE_KEY, null)).toEqual({ off: true, language: 'spa' });

    act(() => subtitles.current.toggle());
    expect(subtitles.current.current).toBe(4);
    expect(storage.get(PREFERENCE_KEY, null)).toEqual({ off: false, language: 'spa' });
  });
});
