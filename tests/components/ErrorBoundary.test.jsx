import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

const crashState = { shouldCrash: true };

const SometimesCrashes = () => {
  if (crashState.shouldCrash) throw new Error('subtitle track missing');

  return <p>Working again</p>;
};

const BoundaryWithResetKey = () => {
  const [pageKey, setPageKey] = useState('first-page');

  return (
    <>
      <button type="button" onClick={() => setPageKey('second-page')}>
        Navigate
      </button>

      <ErrorBoundary resetKey={pageKey}>
        <SometimesCrashes />
      </ErrorBoundary>
    </>
  );
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    crashState.shouldCrash = true;
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('shows a recovery message instead of a blank app, and recovers on retry', () => {
    render(
      <ErrorBoundary>
        <SometimesCrashes />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Something went wrong')).toBeTruthy();
    expect(screen.getByText(/subtitle track missing/)).toBeTruthy();

    crashState.shouldCrash = false;
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.getByText('Working again')).toBeTruthy();
  });

  it('clears the error after navigating to another page', () => {
    render(<BoundaryWithResetKey />);
    expect(screen.getByText('Something went wrong')).toBeTruthy();

    crashState.shouldCrash = false;
    fireEvent.click(screen.getByRole('button', { name: 'Navigate' }));
    expect(screen.getByText('Working again')).toBeTruthy();
  });

  it('can show a custom fallback', () => {
    const PlayerFallback = ({ error }) => <p>Player crashed: {error.message}</p>;

    render(
      <ErrorBoundary fallback={PlayerFallback}>
        <SometimesCrashes />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Player crashed: subtitle track missing')).toBeTruthy();
  });
});
