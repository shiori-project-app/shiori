import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const checkTrackedShowMock = vi.hoisted(() => vi.fn());

vi.mock('@/api/services/trackingService', () => ({ checkTrackedShow: checkTrackedShowMock }));

vi.mock('@/hooks/useDownloads', () => ({
  useDownloads: () => ({ downloads: [], queueEpisodes: () => {} }),
}));

vi.mock('@/hooks/useToast', () => ({ useToast: () => () => {} }));
vi.mock('@/hooks/useLibrary', () => ({ useLibrary: () => ({ fileLinks: {} }) }));

beforeEach(() => rescanMock.mockResolvedValue({ files: [] }));

const { LocalFilesContext } = await import('@/context/LocalFilesContext');
const { TrackingContext, TrackingProvider } = await import('@/context/TrackingContext');
const { useContext } = await import('react');

const rescanMock = vi.hoisted(() => vi.fn());
const localFiles = { rescan: rescanMock };

const Providers = ({ children }) => (
  <LocalFilesContext.Provider value={localFiles}>
    <TrackingProvider>{children}</TrackingProvider>
  </LocalFilesContext.Provider>
);

const renderTracking = () => renderHook(() => useContext(TrackingContext), { wrapper: Providers }).result;

const deferred = () => {
  let finish;

  const promise = new Promise((resolve) => {
    finish = resolve;
  });

  return { promise, finish };
};

const upToDate = (seriesId) => ({
  series: { id: seriesId, title: `Show ${seriesId}` },
  done: [],
  message: 'Up to date',
});

const checkedSeriesIds = () => checkTrackedShowMock.mock.calls.map(([{ seriesId }]) => seriesId);

describe('TrackingContext checks', () => {
  afterEach(() => {
    cleanup();
    checkTrackedShowMock.mockReset();
  });

  it('checks a show tracked during a running check once that check ends, instead of dropping it', async () => {
    const firstCheck = deferred();

    checkTrackedShowMock.mockImplementationOnce(() => firstCheck.promise).mockResolvedValue(upToDate(202));

    const tracking = renderTracking();

    act(() => tracking.current.track({ id: 201, title: 'First show' }, { source: 'nyaa' }));
    await waitFor(() => expect(checkedSeriesIds()).toEqual([201]));

    act(() => tracking.current.track({ id: 202, title: 'Second show' }, { source: 'nyaa' }));

    await act(async () => {
      await Promise.resolve();
    });

    expect(checkedSeriesIds()).toEqual([201]);

    await act(async () => firstCheck.finish(upToDate(201)));
    await waitFor(() => expect(checkedSeriesIds()).toEqual([201, 202]));
    await waitFor(() => expect(tracking.current.tracked[202].lastResult).toBe('Up to date'));
    expect(tracking.current.checking).toBe(false);
  });

  it('wants nothing when the download folder is unreachable, because an empty scan proves nothing', async () => {
    rescanMock.mockResolvedValue({ root: 'D:\\Anime', files: [], isUnreachable: true });

    const tracking = renderTracking();

    act(() => tracking.current.track({ id: 204, title: 'Unplugged show' }, { source: 'nyaa' }));

    await waitFor(() => expect(tracking.current.tracked[204].lastResult).toMatch(/can’t be reached/));
    expect(checkTrackedShowMock).not.toHaveBeenCalled();
    expect(tracking.current.tracked[204].handled).toEqual([]);
    expect(tracking.current.tracked[204].waitingForRelease).toBe(true);
  });

  it('schedules a retry after a failed check, so a network drop doesn’t wait for the long fallback', async () => {
    checkTrackedShowMock.mockRejectedValue(new Error('network is down'));

    const tracking = renderTracking();

    act(() => tracking.current.track({ id: 203, title: 'Offline show' }, { source: 'nyaa' }));

    await waitFor(() => expect(tracking.current.tracked[203].lastResult).toBe('Check failed: network is down'));
    expect(tracking.current.tracked[203].waitingForRelease).toBe(true);
  });
});
