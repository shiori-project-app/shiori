import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const cleanUpFile = vi.hoisted(() => vi.fn());
const getDownloadFolderUsage = vi.hoisted(() => vi.fn());
const findWatchedEpisodesToClean = vi.hoisted(() => vi.fn());
const markEpisodesHandled = vi.hoisted(() => vi.fn());
const rescan = vi.hoisted(() => vi.fn());

vi.mock('@/api/clients/desktopClient', async (importOriginal) => ({
  ...(await importOriginal()),
  cleanUpFile,
  getDownloadFolderUsage,
}));

vi.mock('@/api/services/watchedCleanupService', () => ({ findWatchedEpisodesToClean }));
vi.mock('@/hooks/useLibrary', () => ({ useLibrary: () => ({ watched: {}, watchDates: {}, fileLinks: {} }) }));
vi.mock('@/hooks/usePreferences', () => ({ usePreferences: () => ({ cleanupAfterDays: 30, cleanupAction: 'trash' }) }));
vi.mock('@/hooks/useTracking', () => ({ useTracking: () => ({ markEpisodesHandled }) }));

const { CLEANUP_PHASES, useWatchedCleanup } = await import('@/hooks/useWatchedCleanup');
const { LocalFilesContext } = await import('@/context/LocalFilesContext');

const LocalFiles = ({ children }) => <LocalFilesContext value={{ rescan }}>{children}</LocalFilesContext>;

const renderCleanup = () => renderHook(() => useWatchedCleanup(), { wrapper: LocalFiles });

const candidate = (path, { isConfident = true, seriesId = 1, episodeNumber = 1 } = {}) => ({
  path,
  name: path,
  bytes: 100,
  isConfident,
  episodes: [{ seriesId, episodeNumber }],
});

const SURE = candidate('sure.mkv');
const SECOND = candidate('second.mkv', { episodeNumber: 2 });
const UNSURE = candidate('unsure.mkv', { seriesId: 2, episodeNumber: 5, isConfident: false });

const openReview = async (candidates = [SURE, UNSURE]) => {
  findWatchedEpisodesToClean.mockResolvedValue({ candidates, skippedShows: 0 });

  const { result } = renderCleanup();

  await waitFor(() => expect(result.current.usage).not.toBeNull());
  await act(() => result.current.findEpisodes());

  return result;
};

describe('useWatchedCleanup', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getDownloadFolderUsage.mockResolvedValue({ root: 'D:\\Anime', bytes: 0, files: 0 });
    rescan.mockResolvedValue({ root: 'D:\\Anime', files: [], isUnreachable: false });
    cleanUpFile.mockResolvedValue({ bytes: 100 });
  });

  afterEach(cleanup);

  it('opens the review without touching any file', async () => {
    const result = await openReview();

    expect(result.current.phase).toBe(CLEANUP_PHASES.reviewing);
    expect(cleanUpFile).not.toHaveBeenCalled();
    expect(markEpisodesHandled).not.toHaveBeenCalled();
  });

  it('starts with partial name matches unticked, and cleans only what stays ticked', async () => {
    const result = await openReview();

    expect([...result.current.selectedPaths]).toEqual([SURE.path]);

    await act(() => result.current.confirmCleanup());

    expect(cleanUpFile).toHaveBeenCalledExactlyOnceWith({ relativePath: SURE.path, action: 'trash' });
  });

  it('cleans a partial match the user ticked, and skips one they unticked', async () => {
    const result = await openReview();

    act(() => result.current.toggleCandidate(UNSURE.path));
    act(() => result.current.toggleCandidate(SURE.path));
    await act(() => result.current.confirmCleanup());

    expect(cleanUpFile).toHaveBeenCalledExactlyOnceWith({ relativePath: UNSURE.path, action: 'trash' });
  });

  it('tells tracking before touching a file, so it can’t download the episode again', async () => {
    const result = await openReview();

    await act(() => result.current.confirmCleanup());

    expect(markEpisodesHandled).toHaveBeenCalledExactlyOnceWith(1, [1]);

    expect(markEpisodesHandled.mock.invocationCallOrder[0]).toBeLessThan(cleanUpFile.mock.invocationCallOrder[0]);
  });

  it('carries on after a failure and reports exactly what failed', async () => {
    cleanUpFile.mockRejectedValueOnce(new Error('It’s open in another app')).mockResolvedValueOnce({ bytes: 100 });

    const result = await openReview([SURE, SECOND]);

    await act(() => result.current.confirmCleanup());

    expect(cleanUpFile).toHaveBeenCalledTimes(2);
    expect(result.current.phase).toBe(CLEANUP_PHASES.finished);
    expect(result.current.outcome.cleaned.map(({ candidate: { path } }) => path)).toEqual([SECOND.path]);
    expect(result.current.outcome.failed).toEqual([{ candidate: SURE, failure: 'It’s open in another app' }]);
  });

  it('rescans and remeasures afterwards', async () => {
    const result = await openReview();

    rescan.mockClear();
    getDownloadFolderUsage.mockClear();

    await act(() => result.current.confirmCleanup());

    expect(rescan).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(getDownloadFolderUsage).toHaveBeenCalledTimes(1));
  });

  it('refuses to look when the folder can’t be reached, rather than saying nothing is there', async () => {
    rescan.mockResolvedValue({ root: 'E:\\Anime', files: [], isUnreachable: true });

    const { result } = renderCleanup();

    await act(() => result.current.findEpisodes());

    expect(result.current.errorMessage).toMatch('can’t be reached');
    expect(result.current.phase).toBe(CLEANUP_PHASES.idle);
    expect(findWatchedEpisodesToClean).not.toHaveBeenCalled();
  });

  it('shows why the search failed', async () => {
    findWatchedEpisodesToClean.mockRejectedValue(new Error('AniList is down'));

    const { result } = renderCleanup();

    await act(() => result.current.findEpisodes());

    expect(result.current.errorMessage).toBe('AniList is down');
    expect(result.current.phase).toBe(CLEANUP_PHASES.idle);
  });

  it('closing the review clears it', async () => {
    const result = await openReview();

    act(() => result.current.closeReview());

    expect(result.current.phase).toBe(CLEANUP_PHASES.idle);
    expect(result.current.review).toBeNull();
    expect(cleanUpFile).not.toHaveBeenCalled();
  });
});
