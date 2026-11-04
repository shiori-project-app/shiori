import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PLAY_ON_OPEN } from '@/constants/routes';
import { usePlayOnOpen } from '@/hooks/usePlayOnOpen';

const WATCH_PATH = '/watch/7/3';

const PlayerStandIn = ({ play }) => {
  const location = useLocation();

  usePlayOnOpen(play);

  return <output>{JSON.stringify({ pathname: location.pathname, state: location.state })}</output>;
};

const openPlayer = (state) => {
  const play = vi.fn();

  render(
    <MemoryRouter initialEntries={[{ pathname: WATCH_PATH, state }]}>
      <PlayerStandIn play={play} />
    </MemoryRouter>,
  );

  return play;
};

const currentLocation = () => JSON.parse(screen.getByRole('status').textContent);

describe('usePlayOnOpen', () => {
  afterEach(cleanup);

  it('leaves the episode paused when it was opened from a link', () => {
    expect(openPlayer(null)).not.toHaveBeenCalled();
  });

  it('plays once when the end card opened the episode', () => {
    expect(openPlayer(PLAY_ON_OPEN)).toHaveBeenCalledTimes(1);
  });

  it('clears the request so going back to this episode stays paused', () => {
    openPlayer(PLAY_ON_OPEN);

    expect(currentLocation()).toEqual({ pathname: WATCH_PATH, state: null });
  });
});
