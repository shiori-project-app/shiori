import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useHorizontalScroll } from '@/hooks/useHorizontalScroll';

const TRACK_WIDTH = 400;
const CONTENT_WIDTH = 4000;
const PAGE_MODE = 2;
const LINE_MODE = 1;
const PIXEL_MODE = 0;

const Track = () => {
  const { trackRef } = useHorizontalScroll();

  return <div ref={trackRef} data-testid="track" />;
};

const renderTrack = () => {
  render(<Track />);

  const track = screen.getByTestId('track');

  Object.defineProperty(track, 'clientWidth', { configurable: true, value: TRACK_WIDTH });
  Object.defineProperty(track, 'scrollWidth', { configurable: true, value: CONTENT_WIDTH });

  return track;
};

const wheelOn = (track, deltaY, deltaMode) => {
  const event = new WheelEvent('wheel', { deltaY, deltaMode, cancelable: true });

  act(() => track.dispatchEvent(event));

  return event;
};

describe('useHorizontalScroll wheel', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe = () => {};

        disconnect = () => {};
      },
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it.each([
    ['pixels as they are', 120, PIXEL_MODE, 120],
    ['lines at 40 pixels each', 3, LINE_MODE, 120],
    ['the "one screen at a time" mouse setting as most of a screen', 1, PAGE_MODE, TRACK_WIDTH * 0.75],
  ])('reads %s', (_name, deltaY, deltaMode, expectedDistance) => {
    const track = renderTrack();
    const event = wheelOn(track, deltaY, deltaMode);

    expect(track.scrollLeft).toBe(expectedDistance);
    expect(event.defaultPrevented).toBe(true);
  });

  it('lets the page scroll once the row has reached its end', () => {
    const track = renderTrack();

    track.scrollLeft = CONTENT_WIDTH - TRACK_WIDTH;

    expect(wheelOn(track, 1, PAGE_MODE).defaultPrevented).toBe(false);
  });
});
