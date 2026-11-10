import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocalFilesContext } from '@/context/LocalFilesContext';
import { useVideoResolutions } from '@/hooks/useVideoResolutions';

const getVideoResolutions = vi.hoisted(() => vi.fn());
const getDownloadResolutions = vi.hoisted(() => vi.fn());

vi.mock('@/api/clients/desktopClient', async (importOriginal) => ({
  ...(await importOriginal()),
  getVideoResolutions,
  getDownloadResolutions,
}));

const HD = { width: 1280, height: 720 };
const FULL_HD = { width: 1920, height: 1080 };

const createRescans = () => {
  const listeners = new Set();

  return {
    subscribeToRescans: (listener) => {
      listeners.add(listener);

      return () => listeners.delete(listener);
    },

    finishRescan: () => listeners.forEach((listener) => listener()),
    listenerCount: () => listeners.size,
  };
};

const renderResolutions = (initialPaths, { source, rescans = createRescans() } = {}) => {
  const wrapper = ({ children }) => <LocalFilesContext value={rescans}>{children}</LocalFilesContext>;

  return {
    rescans,

    ...renderHook(({ filePaths }) => useVideoResolutions(filePaths, source), {
      initialProps: { filePaths: initialPaths },
      wrapper,
    }),
  };
};

describe('useVideoResolutions', () => {
  beforeEach(() => {
    getVideoResolutions.mockReset();
    getDownloadResolutions.mockReset();
  });

  afterEach(cleanup);

  it('reads library files by default and finished downloads when asked', async () => {
    getVideoResolutions.mockResolvedValue({ 'one.mkv': HD });
    getDownloadResolutions.mockResolvedValue({ 'C:/Anime/two.mp4': FULL_HD });

    const library = renderResolutions(['one.mkv']);
    const downloads = renderResolutions(['C:/Anime/two.mp4'], { source: 'finishedDownloads' });

    await waitFor(() => expect(library.result.current).toEqual({ 'one.mkv': HD }));
    await waitFor(() => expect(downloads.result.current).toEqual({ 'C:/Anime/two.mp4': FULL_HD }));
    expect(getVideoResolutions).toHaveBeenCalledWith(['one.mkv']);
    expect(getDownloadResolutions).toHaveBeenCalledWith(['C:/Anime/two.mp4']);
  });

  it('keeps the known labels while a longer list is being read', async () => {
    let finishSecondRead;

    getVideoResolutions
      .mockResolvedValueOnce({ 'one.mkv': HD })
      .mockImplementationOnce(() => new Promise((resolve) => (finishSecondRead = resolve)));

    const { result, rerender } = renderResolutions(['one.mkv']);

    await waitFor(() => expect(result.current).toEqual({ 'one.mkv': HD }));

    rerender({ filePaths: ['one.mkv', 'two.mkv'] });
    expect(result.current).toEqual({ 'one.mkv': HD });

    await act(async () => finishSecondRead({ 'one.mkv': HD, 'two.mkv': FULL_HD }));
    expect(result.current).toEqual({ 'one.mkv': HD, 'two.mkv': FULL_HD });
  });

  it('doesn’t read again for an equal list', async () => {
    getVideoResolutions.mockResolvedValue({ 'one.mkv': HD });

    const { result, rerender } = renderResolutions(['one.mkv']);

    await waitFor(() => expect(result.current).toEqual({ 'one.mkv': HD }));
    rerender({ filePaths: ['one.mkv'] });

    expect(getVideoResolutions).toHaveBeenCalledTimes(1);
  });

  it('reads again after a library rescan, so a finished file gets its label', async () => {
    getVideoResolutions.mockResolvedValueOnce({ 'writing.mp4': null }).mockResolvedValueOnce({ 'writing.mp4': HD });

    const { result, rescans } = renderResolutions(['writing.mp4']);

    await waitFor(() => expect(result.current).toEqual({ 'writing.mp4': null }));

    act(() => rescans.finishRescan());

    await waitFor(() => expect(result.current).toEqual({ 'writing.mp4': HD }));
  });

  it('ignores window focus, leaving that to the throttled library rescan', async () => {
    getVideoResolutions.mockResolvedValue({ 'one.mkv': HD });

    const { result } = renderResolutions(['one.mkv']);

    await waitFor(() => expect(result.current).toEqual({ 'one.mkv': HD }));
    act(() => window.dispatchEvent(new Event('focus')));

    expect(getVideoResolutions).toHaveBeenCalledTimes(1);
  });

  it('keeps the same object when a rescan finds nothing new, so rows don’t re-render', async () => {
    getVideoResolutions.mockImplementation(async () => ({ 'one.mkv': { ...HD } }));

    const { result, rescans } = renderResolutions(['one.mkv']);

    await waitFor(() => expect(result.current).toEqual({ 'one.mkv': HD }));

    const firstResult = result.current;

    act(() => rescans.finishRescan());
    await waitFor(() => expect(getVideoResolutions).toHaveBeenCalledTimes(2));
    await act(async () => {});

    expect(result.current).toBe(firstResult);
  });

  it('stops listening for rescans when it unmounts', async () => {
    getVideoResolutions.mockResolvedValue({});

    const { rescans, unmount } = renderResolutions([]);

    expect(rescans.listenerCount()).toBe(1);
    unmount();
    expect(rescans.listenerCount()).toBe(0);
  });

  it('works outside the library context', async () => {
    getVideoResolutions.mockResolvedValue({ 'one.mkv': HD });

    const { result } = renderHook(() => useVideoResolutions(['one.mkv']));

    await waitFor(() => expect(result.current).toEqual({ 'one.mkv': HD }));
  });

  it('ignores an answer that arrives after a newer request started', async () => {
    let finishFirstRead;

    getVideoResolutions
      .mockImplementationOnce(() => new Promise((resolve) => (finishFirstRead = resolve)))
      .mockResolvedValueOnce({ 'two.mkv': FULL_HD });

    const { result, rerender } = renderResolutions(['one.mkv']);

    rerender({ filePaths: ['two.mkv'] });
    await waitFor(() => expect(result.current).toEqual({ 'two.mkv': FULL_HD }));

    await act(async () => finishFirstRead({ 'one.mkv': HD }));
    expect(result.current).toEqual({ 'two.mkv': FULL_HD });
  });

  it('keeps what it has when a read fails', async () => {
    getVideoResolutions
      .mockResolvedValueOnce({ 'one.mkv': HD })
      .mockRejectedValueOnce(new Error('Not in the desktop app'));

    const { result, rerender } = renderResolutions(['one.mkv']);

    await waitFor(() => expect(result.current).toEqual({ 'one.mkv': HD }));

    rerender({ filePaths: ['one.mkv', 'two.mkv'] });
    await waitFor(() => expect(getVideoResolutions).toHaveBeenCalledTimes(2));

    expect(result.current).toEqual({ 'one.mkv': HD });
  });
});
