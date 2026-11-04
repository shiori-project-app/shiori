import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Tabs } from '@/components/common/Tabs';
import { usePlayerHotkeys } from '@/hooks/usePlayerHotkeys';

const fakePlayer = () => ({
  seek: vi.fn(),
  toggle: vi.fn(),
  setVolume: vi.fn(),
  timeRef: { current: 100 },
  volume: 0.5,
  duration: 1000,
});

const PlayerWithTabs = ({ player, onTabChange }) => {
  usePlayerHotkeys(player);

  return (
    <>
      <p>Video page</p>

      <Tabs
        tabs={[
          { id: 'first', label: 'First' },
          { id: 'second', label: 'Second' },
        ]}
        value="first"
        onChange={onTabChange}
        label="Dialog tabs"
      />
    </>
  );
};

describe('usePlayerHotkeys', () => {
  afterEach(cleanup);

  it('seeks with the arrow keys when nothing else used them', () => {
    const player = fakePlayer();

    render(<PlayerWithTabs player={player} onTabChange={() => {}} />);
    fireEvent.keyDown(screen.getByText('Video page'), { key: 'ArrowRight' });
    expect(player.seek).toHaveBeenCalledWith(105);
  });

  it('leaves the video alone when arrow keys move between tabs', () => {
    const player = fakePlayer();
    const onTabChange = vi.fn();

    render(<PlayerWithTabs player={player} onTabChange={onTabChange} />);
    fireEvent.keyDown(screen.getByRole('tab', { name: 'First' }), { key: 'ArrowRight' });
    expect(onTabChange).toHaveBeenCalledWith('second');
    expect(player.seek).not.toHaveBeenCalled();
  });
});
