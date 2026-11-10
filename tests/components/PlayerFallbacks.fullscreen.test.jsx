import { cleanup, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EpisodeUnavailable } from '@/components/player/EpisodeUnavailable';
import { PlayerCrashMessage } from '@/components/player/PlayerCrashMessage';

const exitFullscreen = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/useFullscreen', () => ({ exitFullscreen }));
vi.mock('@/components/downloads/DownloadButton', () => ({ DownloadButton: () => null }));
vi.mock('@/components/downloads/LinkFilesButton', () => ({ LinkFilesButton: () => null }));

const series = { id: 21, banner: '', coverLarge: '', cover: '' };

describe('player fallbacks', () => {
  beforeEach(() => {
    exitFullscreen.mockReset();
  });

  afterEach(cleanup);

  it('leaves fullscreen when the player crashes, so the message can be read and scrolled', () => {
    render(<PlayerCrashMessage error={new Error('Decoder failed')} onRetry={vi.fn()} />);

    expect(exitFullscreen).toHaveBeenCalledTimes(1);
  });

  it('leaves fullscreen when the episode isn’t available', () => {
    render(
      <MemoryRouter>
        <EpisodeUnavailable series={series} episodeNumber={3} state="missing" />
      </MemoryRouter>,
    );

    expect(exitFullscreen).toHaveBeenCalledTimes(1);
  });
});
