import { cleanup, render } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { useInertOutside } from '@/hooks/useInertOutside';

const Page = ({ isActive }) => {
  const playerRef = useRef(null);

  useInertOutside(playerRef, isActive);

  return (
    <div>
      <header data-testid="header">
        <a href="#/">Home</a>
      </header>

      <main>
        <section>
          <div ref={playerRef} data-testid="player">
            <button type="button">Fullscreen</button>
          </div>

          <h1 data-testid="title">Episode 1</h1>
        </section>

        <aside data-testid="sidebar" inert>
          Episodes
        </aside>

        <div data-testid="banner" role="status">
          You're offline
        </div>
      </main>

      <div data-testid="toast" aria-live="polite">
        Download failed
      </div>
    </div>
  );
};

const byTestId = (container, id) => container.querySelector(`[data-testid="${id}"]`);

describe('useInertOutside', () => {
  afterEach(cleanup);

  it('makes everything outside the element inert while active, but not the element itself', () => {
    const { container } = render(<Page isActive />);

    expect(byTestId(container, 'header').inert).toBe(true);
    expect(byTestId(container, 'title').inert).toBe(true);
    expect(byTestId(container, 'player').inert).toBe(false);
  });

  it('restores what it changed and leaves alone what was already inert', () => {
    const { container, rerender } = render(<Page isActive />);

    rerender(<Page isActive={false} />);

    expect(byTestId(container, 'header').inert).toBe(false);
    expect(byTestId(container, 'title').inert).toBe(false);
    expect(byTestId(container, 'sidebar').inert).toBe(true);
  });

  it('leaves live regions such as toasts and the offline banner alone, so screen readers still announce them', () => {
    const { container } = render(<Page isActive />);

    expect(byTestId(container, 'toast').inert).toBe(false);
    expect(byTestId(container, 'banner').inert).toBe(false);
  });

  it('does nothing while inactive', () => {
    const { container } = render(<Page isActive={false} />);

    expect(byTestId(container, 'header').inert).toBe(false);
  });
});
