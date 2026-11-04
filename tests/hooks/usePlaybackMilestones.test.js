import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PROGRESS_SAVE_INTERVAL_MS, usePlaybackMilestones } from '@/hooks/usePlaybackMilestones';

const saveProgress = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/useLibrary', () => ({ useLibrary: () => ({ saveProgress }) }));

const EPISODE_ID = '7-3';
const EPISODE_SECONDS = 1400;

const playerAt = (seconds, { playing = true, duration = EPISODE_SECONDS } = {}) => ({
  playing,
  duration,
  ended: false,
  timeRef: { current: seconds },
  durationRef: { current: duration },
});

const renderMilestones = (player) =>
  renderHook((props) => usePlaybackMilestones(props), {
    initialProps: { episodeId: EPISODE_ID, player, time: player.timeRef.current },
  });

describe('usePlaybackMilestones', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    saveProgress.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('saves the position regularly while playing, so closing the app keeps it', () => {
    const player = playerAt(100);

    renderMilestones(player);
    expect(saveProgress).not.toHaveBeenCalled();

    player.timeRef.current = 120;
    vi.advanceTimersByTime(PROGRESS_SAVE_INTERVAL_MS);
    expect(saveProgress).toHaveBeenCalledExactlyOnceWith(EPISODE_ID, 120);
  });

  it('saves the position when playback pauses and stops saving afterwards', () => {
    const player = playerAt(100);
    const { rerender } = renderMilestones(player);

    rerender({ episodeId: EPISODE_ID, player: { ...player, playing: false } });
    expect(saveProgress).toHaveBeenCalledExactlyOnceWith(EPISODE_ID, 100);

    vi.advanceTimersByTime(PROGRESS_SAVE_INTERVAL_MS * 2);
    expect(saveProgress).toHaveBeenCalledTimes(1);
  });

  it('saves the position when the player closes', () => {
    const { unmount } = renderMilestones(playerAt(200, { playing: false }));

    unmount();
    expect(saveProgress).toHaveBeenCalledExactlyOnceWith(EPISODE_ID, 200);
  });

  it('keeps the saved position when the player closes before the video loaded', () => {
    const { unmount } = renderMilestones(playerAt(300, { playing: false, duration: 0 }));

    unmount();
    expect(saveProgress).not.toHaveBeenCalled();
  });
});
