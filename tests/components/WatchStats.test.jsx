import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const useWatchStatsMock = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/useWatchStats', () => ({ useWatchStats: useWatchStatsMock }));

const { WatchStats } = await import('@/components/library/WatchStats');

const monthStart = (monthIndex) => new Date(2026, monthIndex, 1).getTime();

const stats = (extra) => ({
  episodeCount: 30,
  showCount: 3,
  secondsWatched: 12 * 60 * 60,

  genres: [
    { genre: 'Action', showCount: 2 },
    { genre: 'Drama', showCount: 1 },
  ],

  months: [
    { month: '2026-10', startsAt: monthStart(9), episodes: 4 },
    { month: '2026-11', startsAt: monthStart(10), episodes: 9 },
  ],

  hasWatchDates: true,
  ...extra,
});

describe('WatchStats', () => {
  afterEach(() => {
    cleanup();
    useWatchStatsMock.mockReset();
  });

  it('shows hours, episode and show totals, genres and the month chart', () => {
    useWatchStatsMock.mockReturnValue({ stats: stats(), error: null });
    render(<WatchStats />);
    expect(screen.getByText('Hours watched').nextSibling.textContent).toBe('12h');
    expect(screen.getByText('Episodes watched').nextSibling.textContent).toBe('30');
    expect(screen.getByText('2 shows')).toBeTruthy();
    expect(screen.getByText(/November 2026: 9 episodes/)).toBeTruthy();
    expect(document.querySelector('.is-busiest .month-chart__value').textContent).toBe('9');
  });

  it('explains the month chart when no episode has a date yet', () => {
    useWatchStatsMock.mockReturnValue({ stats: stats({ hasWatchDates: false }), error: null });
    render(<WatchStats />);
    expect(screen.getByText(/from now on show up here by month/)).toBeTruthy();
    expect(document.querySelector('.month-chart')).toBeNull();
  });

  it('shows an empty state before anything is watched', () => {
    useWatchStatsMock.mockReturnValue({ stats: stats({ episodeCount: 0 }), error: null });
    render(<WatchStats />);
    expect(screen.getByRole('heading', { name: 'No stats yet' })).toBeTruthy();
  });
});
