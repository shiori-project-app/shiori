import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DownloadsProvider } from '@/context/DownloadsContext';
import { useDownloads, useLiveDownloads } from '@/hooks/useDownloads';

const desktopClient = vi.hoisted(() => ({ listDownloads: vi.fn(), onDownloadsChanged: vi.fn() }));

vi.mock('@/api/clients/desktopClient', async (importOriginal) => ({ ...(await importOriginal()), ...desktopClient }));
vi.mock('@/api/services/animeHeavenService', () => ({ resolveDownloadUrl: vi.fn() }));

const downloading = (received) => ({ id: 'a', seriesId: 7, episode: 3, state: 'downloading', received, total: 100 });

const renderConsumers = () => {
  const renders = { queue: 0, live: 0, lastQueue: null, lastLive: null };

  const QueueConsumer = () => {
    renders.queue += 1;
    renders.lastQueue = useDownloads().downloads;

    return null;
  };

  const LiveConsumer = () => {
    renders.live += 1;
    renders.lastLive = useLiveDownloads();

    return null;
  };

  render(
    <DownloadsProvider>
      <QueueConsumer />
      <LiveConsumer />
    </DownloadsProvider>,
  );

  return renders;
};

describe('DownloadsContext', () => {
  let broadcastQueue;

  beforeEach(() => {
    window.shiori = {};
    desktopClient.listDownloads.mockResolvedValue([]);

    desktopClient.onDownloadsChanged.mockImplementation((listener) => {
      broadcastQueue = listener;

      return () => {};
    });
  });

  afterEach(() => {
    cleanup();
    delete window.shiori;
  });

  it('tells only the live consumers when nothing but the bytes changed', async () => {
    const renders = renderConsumers();

    await act(async () => {});
    act(() => broadcastQueue([downloading(10)]));

    const queueRenders = renders.queue;
    const liveRenders = renders.live;

    act(() => broadcastQueue([downloading(20)]));

    expect(renders.queue).toBe(queueRenders);
    expect(renders.live).toBe(liveRenders + 1);
    expect(renders.lastLive[0].received).toBe(20);
  });

  it('tells everyone when a download changes state', async () => {
    const renders = renderConsumers();

    await act(async () => {});
    act(() => broadcastQueue([downloading(10)]));
    act(() => broadcastQueue([{ ...downloading(100), state: 'completed' }]));

    expect(renders.lastQueue).toEqual([{ id: 'a', seriesId: 7, episode: 3, state: 'completed' }]);
  });
});
