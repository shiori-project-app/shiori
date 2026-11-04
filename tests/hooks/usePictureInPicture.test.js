import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePictureInPicture } from '@/hooks/usePictureInPicture';

const stubPictureInPicture = (video) => {
  Object.defineProperty(document, 'pictureInPictureEnabled', { configurable: true, value: true });
  Object.defineProperty(document, 'pictureInPictureElement', { configurable: true, writable: true, value: null });

  video.requestPictureInPicture = vi.fn(async () => {
    document.pictureInPictureElement = video;
    video.dispatchEvent(new Event('enterpictureinpicture'));
  });

  document.exitPictureInPicture = vi.fn(async () => {
    document.pictureInPictureElement = null;
    video.dispatchEvent(new Event('leavepictureinpicture'));
  });
};

describe('usePictureInPicture', () => {
  let video;
  let videoRef;

  beforeEach(() => {
    video = document.createElement('video');
    videoRef = { current: video };
  });

  afterEach(() => {
    delete document.pictureInPictureEnabled;
    delete document.pictureInPictureElement;
    delete document.exitPictureInPicture;
  });

  it('enters and leaves picture-in-picture and follows the video’s state', async () => {
    stubPictureInPicture(video);

    const { result } = renderHook(() => usePictureInPicture(videoRef));

    expect(result.current).toMatchObject({ isSupported: true, isActive: false });

    await act(async () => result.current.toggle());
    expect(video.requestPictureInPicture).toHaveBeenCalledOnce();
    expect(result.current.isActive).toBe(true);

    await act(async () => result.current.toggle());
    expect(document.exitPictureInPicture).toHaveBeenCalledOnce();
    expect(result.current.isActive).toBe(false);
  });

  it('closes picture-in-picture when the player goes away, so no orphan window is left', async () => {
    stubPictureInPicture(video);

    const { result, unmount } = renderHook(() => usePictureInPicture(videoRef));

    await act(async () => result.current.toggle());

    unmount();

    expect(document.exitPictureInPicture).toHaveBeenCalledOnce();
    expect(document.pictureInPictureElement).toBeNull();
  });

  it('reports no support and does nothing when the browser lacks picture-in-picture', async () => {
    video.requestPictureInPicture = vi.fn();

    const { result } = renderHook(() => usePictureInPicture(videoRef));

    expect(result.current.isSupported).toBe(false);
    await act(async () => result.current.toggle());
    expect(video.requestPictureInPicture).not.toHaveBeenCalled();
  });
});
