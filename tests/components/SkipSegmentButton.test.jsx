import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SkipSegmentButton } from '@/components/player/SkipSegmentButton';

const inIntro = (extra = {}) => ({
  segment: { type: 'intro', start: 60, end: 150 },
  skip: vi.fn(),
  skipped: null,
  isPrompting: false,
  promptRemaining: 0,
  ...extra,
});

const timerOf = (container) => container.querySelector('.player__skip-timer');

describe('SkipSegmentButton', () => {
  afterEach(cleanup);

  it('sizes the bar from the share of the prompt left while prompting', () => {
    const { container } = render(
      <SkipSegmentButton skipSegments={inIntro({ isPrompting: true, promptRemaining: 0.4 })} hasEnded={false} />,
    );

    expect(screen.getByRole('button', { name: 'Skip intro' }).classList.contains('is-prompting')).toBe(true);
    expect(timerOf(container).style.transform).toBe('scaleX(0.4)');
  });

  it('keeps the button after the prompt, with an empty bar', () => {
    const { container } = render(<SkipSegmentButton skipSegments={inIntro()} hasEnded={false} />);

    expect(screen.getByRole('button', { name: 'Skip intro' }).classList.contains('is-prompting')).toBe(false);
    expect(timerOf(container).style.transform).toBe('scaleX(0)');
  });

  it('skips when clicked', () => {
    const skipSegments = inIntro();

    render(<SkipSegmentButton skipSegments={skipSegments} hasEnded={false} />);
    screen.getByRole('button', { name: 'Skip intro' }).click();

    expect(skipSegments.skip).toHaveBeenCalledTimes(1);
  });

  it('shows nothing once the episode has ended', () => {
    const { container } = render(<SkipSegmentButton skipSegments={inIntro({ isPrompting: true })} hasEnded />);

    expect(container.textContent).toBe('');
  });
});
