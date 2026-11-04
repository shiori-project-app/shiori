import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useResumeEpisode } from '@/hooks/useResumeEpisode';

const useLibraryMock = vi.hoisted(() => vi.fn());
const usePlaybackProgressMock = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/useLibrary', () => ({ useLibrary: useLibraryMock, usePlaybackProgress: usePlaybackProgressMock }));

const SERIES = { id: 7, released: 12 };

const resumeWith = ({ history = [], watched = {}, progress = {} }, series = SERIES) => {
  useLibraryMock.mockReturnValue({ history, watched });
  usePlaybackProgressMock.mockReturnValue(progress);

  return renderHook(() => useResumeEpisode(series)).result.current;
};

describe('useResumeEpisode', () => {
  it('starts at episode 1 for a show never opened', () => {
    expect(resumeWith({})).toEqual({ resumeEpisode: 1, hasStarted: false });
  });

  it('continues an episode that was left part-way', () => {
    expect(resumeWith({ history: ['7-5'], progress: { '7-5': 300 } })).toEqual({ resumeEpisode: 5, hasStarted: true });
  });

  it('continues an unfinished episode with no saved position', () => {
    expect(resumeWith({ history: ['7-5'] }).resumeEpisode).toBe(5);
  });

  it('moves on to the next episode after finishing the last one opened', () => {
    expect(resumeWith({ history: ['7-5'], watched: { 7: [1, 2, 3, 4, 5] } })).toEqual({
      resumeEpisode: 6,
      hasStarted: true,
    });
  });

  it('keeps a finished episode that is being rewatched part-way', () => {
    expect(resumeWith({ history: ['7-5'], watched: { 7: [5] }, progress: { '7-5': 300 } }).resumeEpisode).toBe(5);
  });

  it('stays on the newest released episode when there is nothing after it', () => {
    expect(resumeWith({ history: ['7-12'], watched: { 7: [12] } }).resumeEpisode).toBe(12);
  });

  it('falls back to the episode after the furthest watched when there is no history', () => {
    expect(resumeWith({ watched: { 7: [1, 2, 3] } })).toEqual({ resumeEpisode: 4, hasStarted: true });
  });

  it('ignores history from other shows and episodes not released yet', () => {
    expect(resumeWith({ history: ['9-3', '7-40'] }).resumeEpisode).toBe(1);
  });
});
