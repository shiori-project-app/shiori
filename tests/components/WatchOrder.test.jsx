import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';

const fetchWatchOrderMock = vi.hoisted(() => vi.fn());

vi.mock('@/api/services/franchiseService', () => ({ fetchWatchOrder: fetchWatchOrderMock }));
vi.mock('@/hooks/useLibrary', () => ({ useLibrary: () => ({ list: {}, watched: {} }) }));
vi.mock('@/hooks/usePreferences', () => ({ useDisplayTitle: () => (shown) => shown.title }));

const { WatchOrder } = await import('@/components/anime/WatchOrder');

const series = (extra) => ({ id: 1, title: 'Show', ...extra });

const SEASON = { id: 1, title: 'Season', totalEpisodes: 12 };
const OVA = { id: 2, title: 'OVA', totalEpisodes: 1 };

const FRANCHISE = [
  { series: SEASON, main: true, relation: null },
  { series: OVA, main: false, relation: 'SIDE_STORY' },
];

const renderInRouter = (element) => render(<MemoryRouter>{element}</MemoryRouter>);

describe('WatchOrder', () => {
  afterEach(() => {
    cleanup();
    fetchWatchOrderMock.mockReset();
  });

  it('renders nothing and fetches nothing for a show without a franchise', () => {
    const { container } = render(<WatchOrder series={series({ hasWatchOrder: false })} />);

    expect(container.innerHTML).toBe('');
    expect(fetchWatchOrderMock).not.toHaveBeenCalled();
  });

  it('holds its place with a skeleton while the franchise loads, so the page doesn’t shift', () => {
    fetchWatchOrderMock.mockReturnValue(new Promise(() => {}));

    const { container } = render(<WatchOrder series={series({ hasWatchOrder: true })} />);

    expect(screen.getByRole('heading', { name: 'Watch Order' })).toBeTruthy();
    expect(container.querySelector('aside').getAttribute('aria-busy')).toBe('true');
    expect(container.querySelectorAll('.watch-order__skeleton')).toHaveLength(4);
  });

  it('still loads for saved copies that predate the franchise flag', () => {
    fetchWatchOrderMock.mockReturnValue(new Promise(() => {}));
    render(<WatchOrder series={series({})} />);
    expect(fetchWatchOrderMock).toHaveBeenCalledWith(1);
  });

  it('counts a single remaining title in the singular', async () => {
    fetchWatchOrderMock.mockResolvedValue(FRANCHISE);
    renderInRouter(<WatchOrder series={SEASON} />);
    expect(await screen.findByText('2 titles in release order')).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: 'Main story' }));
    expect(screen.getByText('1 title in release order')).toBeTruthy();
  });

  it('starts over on Everything when moving to another title in the franchise', async () => {
    fetchWatchOrderMock.mockResolvedValue(FRANCHISE);

    const { rerender } = renderInRouter(<WatchOrder series={SEASON} />);

    fireEvent.click(await screen.findByRole('tab', { name: 'Main story' }));

    rerender(
      <MemoryRouter>
        <WatchOrder series={OVA} />
      </MemoryRouter>,
    );

    expect(await screen.findByText('2 titles in release order')).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Everything' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByText('You’re here')).toBeTruthy();
  });
});
