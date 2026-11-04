import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { PREFERENCES_KEY } from '@/constants/preferences';
import { PreferencesProvider } from '@/context/PreferencesContext';
import { useCarousel } from '@/hooks/useCarousel';
import { usePreferences } from '@/hooks/usePreferences';

const INTERVAL_MS = 1000;

const withPreferences = ({ children }) => createElement(PreferencesProvider, null, children);

const renderCarousel = () => renderHook(() => useCarousel(3, INTERVAL_MS), { wrapper: withPreferences });

const renderCarouselWithPreferences = () =>
  renderHook(() => ({ carousel: useCarousel(3, INTERVAL_MS), preferences: usePreferences() }), {
    wrapper: withPreferences,
  });

const systemSetting = (matches) => ({ matches, addEventListener: vi.fn(), removeEventListener: vi.fn() });

const advance = (milliseconds) => act(() => vi.advanceTimersByTime(milliseconds));

const blurEvent = (relatedTarget) => ({ currentTarget: { contains: (node) => node === 'inside' }, relatedTarget });

const focusEventOn = (target) => ({ target });

const focusTarget = ({ isKeyboardFocus }) => {
  const element = document.createElement('button');

  element.matches = (selector) => selector === ':focus-visible' && isKeyboardFocus;
  document.body.append(element);

  return element;
};

describe('useCarousel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(window, 'matchMedia').mockReturnValue(systemSetting(false));
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
    localStorage.clear();
    document.documentElement.removeAttribute('data-reduce-motion');
    document.body.replaceChildren();
  });

  it('follows the Windows setting changing while the app is open', () => {
    const setting = systemSetting(false);

    window.matchMedia.mockReturnValue(setting);

    const { result } = renderCarousel();
    const [, notifyChange] = setting.addEventListener.mock.calls[0];

    advance(INTERVAL_MS);
    expect(result.current.activeIndex).toBe(1);

    setting.matches = true;
    act(() => notifyChange());
    advance(INTERVAL_MS * 3);
    expect(result.current.activeIndex).toBe(1);

    setting.matches = false;
    act(() => notifyChange());
    advance(INTERVAL_MS);
    expect(result.current.activeIndex).toBe(2);
  });

  it('keeps going after a mouse click leaves focus on a button', () => {
    const { result } = renderCarousel();

    act(() => result.current.pauseHandlers.onFocus(focusEventOn(focusTarget({ isKeyboardFocus: false }))));
    advance(INTERVAL_MS);

    expect(result.current.activeIndex).toBe(1);
  });

  it('carries on when the focused element is removed, since no blur arrives', () => {
    const { result } = renderCarousel();
    const element = focusTarget({ isKeyboardFocus: true });

    act(() => result.current.pauseHandlers.onFocus(focusEventOn(element)));
    advance(INTERVAL_MS * 3);
    expect(result.current.activeIndex).toBe(0);

    element.remove();
    advance(INTERVAL_MS);
    advance(INTERVAL_MS);
    expect(result.current.activeIndex).toBe(1);
  });

  it('holds still while Windows asks for less motion', () => {
    window.matchMedia.mockReturnValue(systemSetting(true));

    const { result } = renderCarousel();

    advance(INTERVAL_MS * 3);
    expect(result.current.activeIndex).toBe(0);
  });

  it('holds still when the setting was saved on', () => {
    localStorage.setItem(`shiori:${PREFERENCES_KEY}`, JSON.stringify({ reduceMotion: true }));

    const { result } = renderCarousel();

    advance(INTERVAL_MS * 3);
    expect(result.current.activeIndex).toBe(0);
  });

  it('stops as soon as the setting is turned on, and carries on when it is turned off', () => {
    const { result } = renderCarouselWithPreferences();

    advance(INTERVAL_MS);
    expect(result.current.carousel.activeIndex).toBe(1);

    act(() => result.current.preferences.setPreference('reduceMotion', true));
    advance(INTERVAL_MS * 3);
    expect(result.current.carousel.activeIndex).toBe(1);

    act(() => result.current.preferences.setPreference('reduceMotion', false));
    advance(INTERVAL_MS);
    expect(result.current.carousel.activeIndex).toBe(2);
  });

  it('still lets the user pick a slide while motion is reduced', () => {
    window.matchMedia.mockReturnValue(systemSetting(true));

    const { result } = renderCarousel();

    act(() => result.current.showSlide(2));
    expect(result.current.activeIndex).toBe(2);
  });

  it('advances on its own', () => {
    const { result } = renderCarousel();

    advance(INTERVAL_MS);
    expect(result.current.activeIndex).toBe(1);
  });

  it('holds the slide while hovered and resumes when the pointer leaves', () => {
    const { result } = renderCarousel();

    act(() => result.current.pauseHandlers.onMouseEnter());
    advance(INTERVAL_MS * 3);
    expect(result.current.activeIndex).toBe(0);
    act(() => result.current.pauseHandlers.onMouseLeave());
    advance(INTERVAL_MS);
    expect(result.current.activeIndex).toBe(1);
  });

  it('holds the slide while keyboard focus stays inside it', () => {
    const { result } = renderCarousel();

    act(() => result.current.pauseHandlers.onFocus(focusEventOn(focusTarget({ isKeyboardFocus: true }))));
    act(() => result.current.pauseHandlers.onBlur(blurEvent('inside')));
    advance(INTERVAL_MS * 3);
    expect(result.current.activeIndex).toBe(0);
    act(() => result.current.pauseHandlers.onBlur(blurEvent('outside')));
    advance(INTERVAL_MS);
    expect(result.current.activeIndex).toBe(1);
  });

  it('holds the slide while the window is hidden', () => {
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    const { result } = renderCarousel();

    act(() => document.dispatchEvent(new Event('visibilitychange')));
    advance(INTERVAL_MS * 3);
    expect(result.current.activeIndex).toBe(0);
    visibility.mockReturnValue('visible');
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    advance(INTERVAL_MS);
    expect(result.current.activeIndex).toBe(1);
  });

  it('stops for good once a slide is picked', () => {
    const { result } = renderCarousel();

    act(() => result.current.showSlide(2));
    advance(INTERVAL_MS * 3);
    expect(result.current.activeIndex).toBe(2);
  });
});
