import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  applyReduceMotion,
  scrollByWidthFraction,
  subscribeToSystemMotion,
  systemPrefersReducedMotion,
} from '@/utils/motion';

const fakeSystemSetting = (matches) => ({
  matches,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
});

const setSystemPreference = (matches) => {
  const systemSetting = fakeSystemSetting(matches);

  vi.spyOn(window, 'matchMedia').mockReturnValue(systemSetting);

  return systemSetting;
};

describe('motion', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    applyReduceMotion(false);
  });

  it('marks the page when motion is reduced, and clears it again', () => {
    applyReduceMotion(true);
    expect(document.documentElement.hasAttribute('data-reduce-motion')).toBe(true);

    applyReduceMotion(false);
    expect(document.documentElement.hasAttribute('data-reduce-motion')).toBe(false);
  });

  it('treats a setting missing from older saved preferences as off, instead of flipping the page', () => {
    applyReduceMotion(true);
    applyReduceMotion(undefined);

    expect(document.documentElement.hasAttribute('data-reduce-motion')).toBe(false);
  });

  describe('scrollByWidthFraction', () => {
    const scrollWith = (direction = 1) => {
      const element = { clientWidth: 1000, scrollBy: vi.fn() };

      scrollByWidthFraction(element, 0.75, direction);

      return element.scrollBy.mock.calls[0][0];
    };

    it('moves by that share of the width, in either direction', () => {
      setSystemPreference(false);

      expect(scrollWith(1).left).toBe(750);
      expect(scrollWith(-1).left).toBe(-750);
    });

    it('scrolls smoothly by default', () => {
      setSystemPreference(false);

      expect(scrollWith().behavior).toBe('smooth');
    });

    it('jumps when the setting is on', () => {
      setSystemPreference(false);
      applyReduceMotion(true);

      expect(scrollWith().behavior).toBe('auto');
    });

    it('jumps when Windows asks for less motion, even with the setting off', () => {
      setSystemPreference(true);

      expect(scrollWith().behavior).toBe('auto');
    });
  });

  it('reads the Windows setting', () => {
    setSystemPreference(true);

    expect(systemPrefersReducedMotion()).toBe(true);
  });

  it('listens for the Windows setting changing, and stops when asked', () => {
    const systemSetting = setSystemPreference(false);
    const onChange = vi.fn();
    const unsubscribe = subscribeToSystemMotion(onChange);

    expect(systemSetting.addEventListener).toHaveBeenCalledWith('change', onChange);

    unsubscribe();
    expect(systemSetting.removeEventListener).toHaveBeenCalledWith('change', onChange);
  });
});
