import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EpisodePanel } from '@/components/anime/EpisodePanel';

const useVideoResolutions = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/useVideoResolutions', () => ({ useVideoResolutions }));
vi.mock('@/hooks/useSession', () => ({ useSession: () => ({ episodeBlocks: {}, setEpisodeBlock: vi.fn() }) }));
vi.mock('@/hooks/useEpisodeTitles', () => ({ useEpisodeTitles: () => ({}) }));

vi.mock('@/hooks/useEpisodeAvailability', () => ({
  useEpisodeAvailability: () => (episodeNumber) => {
    const states = {
      1: { state: 'ready', file: { path: 'Show/Show - 01.mkv' } },
      2: { state: 'downloading', file: { path: 'Show/Show - 02.mkv', inProgress: true } },
    };

    return states[episodeNumber] ?? { state: 'missing', file: null };
  },
}));

vi.mock('@/components/anime/EpisodeRow', () => ({
  EpisodeRow: ({ episode, state, resolution }) => (
    <p>{`Episode ${episode.number}: ${state}${resolution ? ` ${resolution}` : ''}`}</p>
  ),
}));

const series = { id: 7, released: 3, streamingEpisodes: {}, duration: 1440 };

describe('EpisodePanel', () => {
  it('asks only for downloaded files and labels their rows', () => {
    useVideoResolutions.mockReturnValue({ 'Show/Show - 01.mkv': { width: 1920, height: 1080 } });

    render(<EpisodePanel series={series} />);

    expect(useVideoResolutions).toHaveBeenCalledWith(['Show/Show - 01.mkv']);
    expect(screen.getByText('Episode 1: ready 1080p')).toBeTruthy();
    expect(screen.getByText('Episode 2: downloading')).toBeTruthy();
    expect(screen.getByText('Episode 3: missing')).toBeTruthy();
  });
});
