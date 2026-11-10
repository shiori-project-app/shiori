import { act, cleanup, render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WatchPage } from '@/pages/WatchPage';

const exitFullscreen = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/useFullscreen', () => ({ exitFullscreen }));
vi.mock('@/hooks/useSeries', () => ({ useSeries: () => ({ loading: true }) }));
vi.mock('@/components/player/Player', () => ({ Player: () => null }));

const renderWatchRoute = () => {
  const router = createMemoryRouter(
    [
      { path: '/watch/:id/:ep', element: <WatchPage /> },
      { path: '/', element: <p>Home</p> },
    ],
    { initialEntries: ['/watch/21/1'] },
  );

  render(<RouterProvider router={router} />);

  return router;
};

describe('WatchPage fullscreen', () => {
  beforeEach(() => {
    exitFullscreen.mockReset();
  });

  afterEach(cleanup);

  it('stays in fullscreen when moving to the next episode, because the page stays mounted', async () => {
    const router = renderWatchRoute();

    await act(() => router.navigate('/watch/21/2'));

    expect(exitFullscreen).not.toHaveBeenCalled();
  });

  it('leaves fullscreen when leaving the watch page', async () => {
    const router = renderWatchRoute();

    await act(() => router.navigate('/'));

    expect(exitFullscreen).toHaveBeenCalledTimes(1);
  });
});
