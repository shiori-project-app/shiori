import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useVideoPlayer } from '@/hooks/useVideoPlayer';

const renderPlayer = () => {
  const video = document.createElement('video');
  const videoRef = { current: video };

  return { video, ...renderHook(() => useVideoPlayer(videoRef)) };
};

describe('useVideoPlayer', () => {
  afterEach(cleanup);

  it('keeps the same player object while only the time moves', () => {
    const { video, result } = renderPlayer();
    const playerBefore = result.current.player;

    video.currentTime = 12;
    act(() => video.dispatchEvent(new Event('timeupdate')));

    expect(result.current.time).toBe(12);
    expect(result.current.player).toBe(playerBefore);
  });

  it('gives a new player object when playback state changes', () => {
    const { video, result } = renderPlayer();
    const playerBefore = result.current.player;

    act(() => video.dispatchEvent(new Event('play')));

    expect(result.current.player).not.toBe(playerBefore);
    expect(result.current.player.playing).toBe(true);
  });
});
