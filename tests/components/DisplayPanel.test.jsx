import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/useSettings', () => ({
  useSettings: () => ({ smoothGraphics: false, smoothGraphicsAtLaunch: false }),
}));

const { DisplayPanel } = await import('@/components/settings/DisplayPanel');
const { PreferencesProvider } = await import('@/context/PreferencesContext');

const renderPanel = () =>
  render(
    <PreferencesProvider>
      <DisplayPanel />
    </PreferencesProvider>,
  );

const reduceMotionSwitch = () => screen.getByRole('switch', { name: 'Reduce motion' });

const isMotionReducedOnPage = () => document.documentElement.hasAttribute('data-reduce-motion');

describe('DisplayPanel reduce motion', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    document.documentElement.removeAttribute('data-reduce-motion');
  });

  it('is off by default', () => {
    renderPanel();

    expect(reduceMotionSwitch().getAttribute('aria-checked')).toBe('false');
    expect(isMotionReducedOnPage()).toBe(false);
  });

  it('applies to the page straight away, and turns back off', () => {
    renderPanel();

    fireEvent.click(reduceMotionSwitch());
    expect(reduceMotionSwitch().getAttribute('aria-checked')).toBe('true');
    expect(isMotionReducedOnPage()).toBe(true);

    fireEvent.click(reduceMotionSwitch());
    expect(isMotionReducedOnPage()).toBe(false);
  });

  describe('while animation effects are off in Windows', () => {
    beforeEach(() => {
      vi.spyOn(window, 'matchMedia').mockReturnValue({
        matches: true,
        addEventListener: () => {},
        removeEventListener: () => {},
      });
    });

    afterEach(() => vi.restoreAllMocks());

    it('shows as on, because motion really is reduced', () => {
      renderPanel();

      expect(reduceMotionSwitch().getAttribute('aria-checked')).toBe('true');
    });

    it('cannot be changed here, and says where to change it', () => {
      renderPanel();

      expect(reduceMotionSwitch().disabled).toBe(true);
      expect(screen.getByText(/Turn them back on there/)).toBeTruthy();

      fireEvent.click(reduceMotionSwitch());
      expect(isMotionReducedOnPage()).toBe(false);
    });
  });

  it('remembers the choice after the app reopens', () => {
    const { unmount } = renderPanel();

    fireEvent.click(reduceMotionSwitch());
    unmount();
    document.documentElement.removeAttribute('data-reduce-motion');
    renderPanel();

    expect(reduceMotionSwitch().getAttribute('aria-checked')).toBe('true');
    expect(isMotionReducedOnPage()).toBe(true);
  });
});
