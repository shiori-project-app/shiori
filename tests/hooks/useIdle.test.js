import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useIdle } from '@/hooks/useIdle';

const IDLE_AFTER_MS = 2600;

describe('useIdle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('becomes idle on its own, without waiting for a first mouse move', () => {
    const { result } = renderHook(() => useIdle(IDLE_AFTER_MS));

    expect(result.current[0]).toBe(false);

    act(() => vi.advanceTimersByTime(IDLE_AFTER_MS));

    expect(result.current[0]).toBe(true);
  });

  it('wakes on activity and waits the full delay again', () => {
    const { result } = renderHook(() => useIdle(IDLE_AFTER_MS));

    act(() => vi.advanceTimersByTime(IDLE_AFTER_MS));
    act(() => result.current[1]());

    expect(result.current[0]).toBe(false);

    act(() => vi.advanceTimersByTime(IDLE_AFTER_MS - 1));
    expect(result.current[0]).toBe(false);

    act(() => vi.advanceTimersByTime(1));
    expect(result.current[0]).toBe(true);
  });

  it('doesn’t go idle early when activity comes before the first timer ends', () => {
    const { result } = renderHook(() => useIdle(IDLE_AFTER_MS));

    act(() => vi.advanceTimersByTime(IDLE_AFTER_MS - 100));
    act(() => result.current[1]());
    act(() => vi.advanceTimersByTime(200));

    expect(result.current[0]).toBe(false);
  });

  it('stops its timer when it unmounts', () => {
    const { unmount } = renderHook(() => useIdle(IDLE_AFTER_MS));

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});
