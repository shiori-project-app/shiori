import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DownloadQueue } from '@/components/downloads/DownloadQueue';

const useVideoResolutions = vi.hoisted(() => vi.fn());

const downloads = vi.hoisted(() => [
  { id: 'done', label: 'Episode 1', state: 'completed', savePath: 'C:/Anime/Show - 01.mp4', received: 1, total: 1 },
  {
    id: 'running',
    label: 'Episode 2',
    state: 'downloading',
    savePath: 'C:/Anime/Show - 02.mp4',
    received: 0,
    total: 0,
  },
]);

vi.mock('@/hooks/useVideoResolutions', () => ({ useVideoResolutions }));
vi.mock('@/components/common/Pager', () => ({ Pager: () => null }));

vi.mock('@/hooks/useDownloads', () => ({
  useLiveDownloads: () => downloads,
  useDownloads: () => ({}),
}));

vi.mock('@/hooks/usePagedList', () => ({
  usePagedList: (items) => ({ pageItems: items, pageInfo: {}, firstItemIndex: 0, setPage: vi.fn() }),
}));

describe('DownloadQueue', () => {
  it('asks for finished downloads only and adds their resolution to the status', () => {
    useVideoResolutions.mockReturnValue({ 'C:/Anime/Show - 01.mp4': { width: 1280, height: 720 } });

    render(<DownloadQueue />);

    expect(useVideoResolutions).toHaveBeenCalledWith(['C:/Anime/Show - 01.mp4'], 'finishedDownloads');
    expect(screen.getByText('Done · 720p')).toBeTruthy();
    expect(screen.getByText('Starting…')).toBeTruthy();
  });
});
