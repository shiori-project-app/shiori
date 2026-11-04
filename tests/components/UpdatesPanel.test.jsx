import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UPDATE_PHASES } from '@shared/updatePhases';

const useSettingsMock = vi.hoisted(() => vi.fn());
const useAppUpdateMock = vi.hoisted(() => vi.fn());
const desktop = vi.hoisted(() => ({ checkForUpdates: vi.fn(), downloadUpdate: vi.fn(), installUpdate: vi.fn() }));

vi.mock('@/hooks/useSettings', () => ({ useSettings: useSettingsMock }));
vi.mock('@/hooks/useAppUpdate', () => ({ useAppUpdate: useAppUpdateMock }));
vi.mock('@/api/clients/desktopClient', () => desktop);

const { UpdatesPanel } = await import('@/components/settings/UpdatesPanel');

const renderPanel = (update, settings = {}) => {
  const updateAutoUpdate = vi.fn();

  useAppUpdateMock.mockReturnValue({
    currentVersion: '1.0.0',
    availableVersion: '1.1.0',
    downloadPercent: 0,
    ...update,
  });

  useSettingsMock.mockReturnValue({ autoUpdate: true, updateAutoUpdate, ...settings });
  render(<UpdatesPanel />);

  return updateAutoUpdate;
};

const autoUpdateSwitch = () => screen.getByRole('switch', { name: 'Download updates automatically' });

describe('UpdatesPanel', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('shows nothing until the state has loaded, rather than saying this copy cannot update', () => {
    useAppUpdateMock.mockReturnValue(null);
    useSettingsMock.mockReturnValue({ autoUpdate: false, updateAutoUpdate: vi.fn() });
    render(<UpdatesPanel />);

    expect(screen.queryByText(/only work in an installed copy/)).toBeNull();
    expect(screen.queryByRole('switch')).toBeNull();
  });

  it('shows the current version', () => {
    renderPanel({ phase: UPDATE_PHASES.idle });

    expect(screen.getByText('Shiori 1.0.0')).toBeTruthy();
  });

  it.each([
    [UPDATE_PHASES.idle, 'Check for updates', 'checkForUpdates'],
    [UPDATE_PHASES.upToDate, 'Check for updates', 'checkForUpdates'],
    [UPDATE_PHASES.failed, 'Try again', 'checkForUpdates'],
    [UPDATE_PHASES.available, 'Download', 'downloadUpdate'],
    [UPDATE_PHASES.ready, 'Restart to update', 'installUpdate'],
  ])('while %s offers "%s"', async (phase, label, action) => {
    renderPanel({ phase });
    fireEvent.click(screen.getByRole('button', { name: label }));

    await waitFor(() => expect(desktop[action]).toHaveBeenCalledTimes(1));
  });

  it.each([UPDATE_PHASES.checking, UPDATE_PHASES.downloading, UPDATE_PHASES.unsupported])(
    'offers no button while %s',
    (phase) => {
      renderPanel({ phase });

      expect(screen.queryByRole('button')).toBeNull();
    },
  );

  it('shows download progress', () => {
    renderPanel({ phase: UPDATE_PHASES.downloading, downloadPercent: 42 });

    expect(screen.getByText('Downloading version 1.1.0: 42%')).toBeTruthy();
  });

  it('turns automatic updates off', () => {
    const updateAutoUpdate = renderPanel({ phase: UPDATE_PHASES.idle });

    fireEvent.click(autoUpdateSwitch());

    expect(updateAutoUpdate).toHaveBeenCalledExactlyOnceWith({ autoUpdate: false });
  });

  it('locks the switch and says why in a copy that cannot update', () => {
    const updateAutoUpdate = renderPanel({ phase: UPDATE_PHASES.unsupported });

    expect(autoUpdateSwitch().disabled).toBe(true);
    expect(autoUpdateSwitch().getAttribute('aria-checked')).toBe('false');
    expect(screen.getByText('Updates only work in an installed copy of Shiori.')).toBeTruthy();

    fireEvent.click(autoUpdateSwitch());
    expect(updateAutoUpdate).not.toHaveBeenCalled();
  });
});
