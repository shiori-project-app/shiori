import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const listeners = vi.hoisted(() => new Set());

vi.mock('@/api/clients/desktopClient', () => ({
  onHiddenToTray: (listener) => {
    listeners.add(listener);

    return () => listeners.delete(listener);
  },
}));

const { usePauseWhenHiddenToTray } = await import('@/hooks/usePauseWhenHiddenToTray');

const hideToTray = () => [...listeners].forEach((listener) => listener());

const setPictureInPictureElement = (element) =>
  Object.defineProperty(document, 'pictureInPictureElement', { configurable: true, value: element });

describe('usePauseWhenHiddenToTray', () => {
  afterEach(() => {
    cleanup();
    setPictureInPictureElement(null);
  });

  it('pauses when the window goes to the tray, so audio does not play from nowhere', () => {
    const pause = vi.fn();

    renderHook(() => usePauseWhenHiddenToTray({ current: document.createElement('video') }, pause));
    hideToTray();

    expect(pause).toHaveBeenCalledTimes(1);
  });

  it('keeps playing in picture-in-picture, which is still on screen', () => {
    const pause = vi.fn();
    const video = document.createElement('video');

    setPictureInPictureElement(video);
    renderHook(() => usePauseWhenHiddenToTray({ current: video }, pause));
    hideToTray();

    expect(pause).not.toHaveBeenCalled();
  });

  it('stops listening once the player closes', () => {
    const pause = vi.fn();
    const { unmount } = renderHook(() => usePauseWhenHiddenToTray({ current: null }, pause));

    unmount();
    hideToTray();

    expect(pause).not.toHaveBeenCalled();
  });
});
