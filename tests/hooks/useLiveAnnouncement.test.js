import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ANNOUNCEMENT_DELAY_MS, useLiveAnnouncement } from '@/hooks/useLiveAnnouncement';

describe('useLiveAnnouncement', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('empties the text first and sets the message a moment later, so a repeat is a change', () => {
    const { result } = renderHook(() => useLiveAnnouncement());

    act(() => result.current.announce('Saved'));
    act(() => vi.advanceTimersByTime(ANNOUNCEMENT_DELAY_MS));
    expect(result.current.announcement).toBe('Saved');

    act(() => result.current.announce('Saved'));
    expect(result.current.announcement).toBe('');

    act(() => vi.advanceTimersByTime(ANNOUNCEMENT_DELAY_MS));
    expect(result.current.announcement).toBe('Saved');
  });

  it('announces only the latest message when several arrive close together', () => {
    const { result } = renderHook(() => useLiveAnnouncement());

    act(() => result.current.announce('First'));
    act(() => result.current.announce('Second'));
    act(() => vi.advanceTimersByTime(ANNOUNCEMENT_DELAY_MS));

    expect(result.current.announcement).toBe('Second');
  });

  it('clears straight away and cancels a message still waiting', () => {
    const { result } = renderHook(() => useLiveAnnouncement());

    act(() => result.current.announce('Saved'));
    act(() => result.current.clearAnnouncement());
    act(() => vi.advanceTimersByTime(ANNOUNCEMENT_DELAY_MS));

    expect(result.current.announcement).toBe('');
  });

  it('keeps announce and clearAnnouncement stable between renders', () => {
    const { result, rerender } = renderHook(() => useLiveAnnouncement());
    const { announce, clearAnnouncement } = result.current;

    rerender();

    expect(result.current.announce).toBe(announce);
    expect(result.current.clearAnnouncement).toBe(clearAnnouncement);
  });

  it('stops its timer when it unmounts', () => {
    const { result, unmount } = renderHook(() => useLiveAnnouncement());

    act(() => result.current.announce('Saved'));
    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});
