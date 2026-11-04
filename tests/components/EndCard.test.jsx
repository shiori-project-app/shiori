import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AUTOPLAY_COUNTDOWN_S } from '@/config/app.config';
import { PLAY_ON_OPEN } from '@/constants/routes';

const libraryMock = vi.hoisted(() => ({ autoplay: true }));

vi.mock('@/hooks/useLibrary', () => ({ useLibrary: () => libraryMock }));
vi.mock('@/hooks/usePreferences', () => ({ useDisplayTitle: () => (series) => series.title }));
vi.mock('@/components/downloads/DownloadButton', () => ({ DownloadButton: () => null }));

const { EndCard } = await import('@/components/player/EndCard');

const SERIES = { id: 7, title: 'Frieren' };
const SECOND_MS = 1000;

const LocationProbe = () => {
  const location = useLocation();

  return <output>{JSON.stringify({ pathname: location.pathname, state: location.state })}</output>;
};

const renderEndCard = ({ ended = true } = {}) =>
  render(
    <MemoryRouter initialEntries={['/watch/7/3']}>
      <EndCard series={SERIES} nextEpisode={4} nextReady ended={ended} onReplay={() => {}} />
      <LocationProbe />
    </MemoryRouter>,
  );

const currentLocation = () => JSON.parse(screen.getByRole('status').textContent);

const waitOutCountdown = () =>
  Array.from({ length: AUTOPLAY_COUNTDOWN_S + 1 }).forEach(() =>
    act(() => {
      vi.advanceTimersByTime(SECOND_MS);
    }),
  );

describe('EndCard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    libraryMock.autoplay = true;
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('asks the next episode to play when "Play next" is pressed', () => {
    libraryMock.autoplay = false;
    renderEndCard();

    fireEvent.click(screen.getByRole('link', { name: 'Play next' }));

    expect(currentLocation()).toEqual({ pathname: '/watch/7/4', state: PLAY_ON_OPEN });
  });

  it('asks the next episode to play when the autoplay countdown finishes', () => {
    renderEndCard();

    waitOutCountdown();

    expect(currentLocation()).toEqual({ pathname: '/watch/7/4', state: PLAY_ON_OPEN });
  });

  it('stays on the episode when autoplay is off', () => {
    libraryMock.autoplay = false;
    renderEndCard();

    waitOutCountdown();

    expect(currentLocation().pathname).toBe('/watch/7/3');
  });
});
