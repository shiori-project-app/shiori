import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { exitFullscreen, useFullscreen } from '@/hooks/useFullscreen';

const fullscreen = { element: null };

const enterFullscreen = () => {
  fullscreen.element = document.documentElement;
  document.dispatchEvent(new Event('fullscreenchange'));
};

const leaveFullscreen = () => {
  fullscreen.element = null;
  document.dispatchEvent(new Event('fullscreenchange'));
};

const NO_ELEMENT = { current: null };

const originalExitFullscreen = document.exitFullscreen;
const originalRequestFullscreen = document.documentElement.requestFullscreen;

describe('useFullscreen', () => {
  beforeEach(() => {
    fullscreen.element = null;
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => fullscreen.element });
    document.exitFullscreen = vi.fn(async () => leaveFullscreen());
    document.documentElement.requestFullscreen = vi.fn(async () => enterFullscreen());
  });

  afterEach(() => {
    cleanup();
    delete document.fullscreenElement;
    document.exitFullscreen = originalExitFullscreen;
    document.documentElement.requestFullscreen = originalRequestFullscreen;
  });

  it('puts the whole app window in fullscreen, so it survives the player being replaced', async () => {
    const { result } = renderHook(() => useFullscreen(NO_ELEMENT));

    await act(async () => result.current.toggleFullscreen());

    expect(document.documentElement.requestFullscreen).toHaveBeenCalledTimes(1);
    expect(result.current.isFullscreen).toBe(true);

    await act(async () => result.current.toggleFullscreen());

    expect(document.exitFullscreen).toHaveBeenCalledTimes(1);
    expect(result.current.isFullscreen).toBe(false);
  });

  it('follows fullscreen changes made outside the player, such as Escape', () => {
    const { result } = renderHook(() => useFullscreen(NO_ELEMENT));

    act(() => enterFullscreen());
    expect(result.current.isFullscreen).toBe(true);

    act(() => leaveFullscreen());
    expect(result.current.isFullscreen).toBe(false);
  });

  it('starts in fullscreen when the window already is, as for the next episode', () => {
    enterFullscreen();

    const { result } = renderHook(() => useFullscreen(NO_ELEMENT));

    expect(result.current.isFullscreen).toBe(true);
  });

  it('leaves fullscreen alone when the player closes, since the watch page decides that', () => {
    enterFullscreen();

    const { unmount } = renderHook(() => useFullscreen(NO_ELEMENT));

    unmount();

    expect(document.exitFullscreen).not.toHaveBeenCalled();
  });

  it('makes the page around the player inert while fullscreen, and restores it after', () => {
    const page = document.createElement('div');
    const header = document.createElement('header');
    const player = document.createElement('div');

    page.append(header, player);
    document.body.append(page);

    const playerRef = { current: player };

    renderHook(() => useFullscreen(playerRef));

    act(() => enterFullscreen());
    expect(header.inert).toBe(true);
    expect(player.inert).toBe(false);

    act(() => leaveFullscreen());
    expect(header.inert).toBe(false);

    page.remove();
  });

  it('exits only when the window is fullscreen', () => {
    exitFullscreen();
    expect(document.exitFullscreen).not.toHaveBeenCalled();

    enterFullscreen();
    exitFullscreen();
    expect(document.exitFullscreen).toHaveBeenCalledTimes(1);
  });
});
