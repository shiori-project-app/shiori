import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const useSettingsMock = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/useSettings', () => ({ useSettings: useSettingsMock }));

const { SmoothGraphicsRow } = await import('@/components/settings/SmoothGraphicsRow');

const renderRow = (settings) => {
  const updateGraphics = vi.fn();
  const restartApp = vi.fn();

  useSettingsMock.mockReturnValue({ updateGraphics, restartApp, ...settings });
  render(<SmoothGraphicsRow />);

  return { updateGraphics, restartApp };
};

describe('SmoothGraphicsRow', () => {
  afterEach(() => {
    cleanup();
    useSettingsMock.mockReset();
  });

  it('turns the setting on, with no restart offered while nothing has changed', () => {
    const { updateGraphics } = renderRow({ smoothGraphics: false, smoothGraphicsAtLaunch: false });

    expect(screen.queryByRole('button', { name: 'Restart to apply' })).toBeNull();
    fireEvent.click(screen.getByRole('switch'));
    expect(updateGraphics).toHaveBeenCalledWith({ smoothGraphics: true });
  });

  it('offers a restart when the saved value differs from the running one', () => {
    const { restartApp } = renderRow({ smoothGraphics: true, smoothGraphicsAtLaunch: false });

    fireEvent.click(screen.getByRole('button', { name: 'Restart to apply' }));
    expect(restartApp).toHaveBeenCalled();
  });

  it('offers no restart when the saved value matches the running one', () => {
    renderRow({ smoothGraphics: true, smoothGraphicsAtLaunch: true });
    expect(screen.queryByRole('button', { name: 'Restart to apply' })).toBeNull();
  });
});
