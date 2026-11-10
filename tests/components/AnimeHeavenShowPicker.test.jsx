import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AnimeHeavenShowPicker } from '@/components/downloads/AnimeHeavenShowPicker';

const animeHeavenShow = {
  searchInput: 'One Piece',
  setSearchInput: vi.fn(),
  search: vi.fn(),
  foundShows: { data: [], loading: false, error: null },
  shows: [{ code: 'abc12', title: 'One Piece' }],
  selectedShow: { code: 'abc12', title: 'One Piece' },
  pickShow: vi.fn(),
};

describe('AnimeHeavenShowPicker', () => {
  afterEach(cleanup);

  it('doesn’t promise a resolution, because AnimeHeaven’s pages don’t state one', () => {
    render(<AnimeHeavenShowPicker animeHeavenShow={animeHeavenShow} />);

    expect(screen.getByText('subbed')).toBeTruthy();
    expect(
      screen.getByText(/highest resolution AnimeHeaven has for each episode, which isn’t always 1080p/),
    ).toBeTruthy();
  });

  it('leaves out the resolution note until a show is found', () => {
    render(<AnimeHeavenShowPicker animeHeavenShow={{ ...animeHeavenShow, shows: [], selectedShow: null }} />);

    expect(screen.queryByText(/highest resolution/)).toBeNull();
  });
});
