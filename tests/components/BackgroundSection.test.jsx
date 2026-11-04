import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const useSettingsMock = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/useSettings', () => ({ useSettings: useSettingsMock }));

const { BackgroundSection } = await import('@/components/settings/BackgroundSection');

const renderSection = (settings = {}) => {
  const updateBackground = vi.fn();

  useSettingsMock.mockReturnValue({
    keepRunningInTray: false,
    canKeepRunningInTray: true,
    startAtLogin: false,
    canStartAtLogin: true,
    updateBackground,
    ...settings,
  });

  render(<BackgroundSection />);

  return updateBackground;
};

const switchNamed = (name) => screen.getByRole('switch', { name });

describe('BackgroundSection', () => {
  afterEach(cleanup);

  it('is off by default', () => {
    renderSection();

    expect(switchNamed('Keep running in the tray').getAttribute('aria-checked')).toBe('false');
    expect(switchNamed('Start with Windows').getAttribute('aria-checked')).toBe('false');
  });

  it('turns the tray on', () => {
    const updateBackground = renderSection();

    fireEvent.click(switchNamed('Keep running in the tray'));
    expect(updateBackground).toHaveBeenCalledExactlyOnceWith({ keepRunningInTray: true });
  });

  it('turns starting with Windows off again', () => {
    const updateBackground = renderSection({ startAtLogin: true });

    fireEvent.click(switchNamed('Start with Windows'));
    expect(updateBackground).toHaveBeenCalledExactlyOnceWith({ startAtLogin: false });
  });

  it('says it opens in the tray only when the tray is on', () => {
    renderSection({ keepRunningInTray: true });
    expect(screen.getByText(/Opens in the tray when you sign in/)).toBeTruthy();

    cleanup();

    renderSection({ keepRunningInTray: false });
    expect(screen.getByText('Opens Shiori when you sign in.')).toBeTruthy();
  });

  it('locks starting with Windows outside the installed app', () => {
    const updateBackground = renderSection({ canStartAtLogin: false });

    expect(switchNamed('Start with Windows').disabled).toBe(true);
    expect(screen.getByText('Only available in the installed app.')).toBeTruthy();

    fireEvent.click(switchNamed('Start with Windows'));
    expect(updateBackground).not.toHaveBeenCalled();
  });

  it('names signing in instead of Windows on Linux', () => {
    const updateBackground = renderSection({ platform: 'linux' });

    expect(screen.queryByText('Start with Windows')).toBeNull();

    fireEvent.click(switchNamed('Start when you sign in'));
    expect(updateBackground).toHaveBeenCalledExactlyOnceWith({ startAtLogin: true });
  });

  describe('on a desktop with no tray area', () => {
    it('locks the tray switch and says why, since closing the window would leave no way to quit', () => {
      const updateBackground = renderSection({ keepRunningInTray: true, canKeepRunningInTray: false });

      expect(switchNamed('Keep running in the tray').disabled).toBe(true);
      expect(switchNamed('Keep running in the tray').getAttribute('aria-checked')).toBe('false');
      expect(screen.getByText(/Your desktop has no tray area/)).toBeTruthy();

      fireEvent.click(switchNamed('Keep running in the tray'));
      expect(updateBackground).not.toHaveBeenCalled();
    });

    it('does not promise to open in the tray', () => {
      renderSection({ keepRunningInTray: true, canKeepRunningInTray: false });

      expect(screen.getByText('Opens Shiori when you sign in.')).toBeTruthy();
    });
  });
});
