import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UPDATE_PHASES } from '@shared/updatePhases';

const desktop = vi.hoisted(() => ({
  hasDesktopBridge: vi.fn(),
  getUpdateState: vi.fn(),
  onUpdateStateChanged: vi.fn(),
}));

vi.mock('@/api/clients/desktopClient', () => desktop);

const { useAppUpdate } = await import('@/hooks/useAppUpdate');

const IDLE = { phase: UPDATE_PHASES.idle, currentVersion: '1.0.0', availableVersion: null, downloadPercent: 0 };

describe('useAppUpdate', () => {
  beforeEach(() => {
    desktop.hasDesktopBridge.mockReturnValue(true);
    desktop.getUpdateState.mockResolvedValue(IDLE);
    desktop.onUpdateStateChanged.mockReturnValue(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.resetAllMocks();
  });

  it('has no state until it loads, so an installed copy never looks unsupported', async () => {
    const { result } = renderHook(() => useAppUpdate());

    expect(result.current).toBeNull();
    await waitFor(() => expect(result.current).toEqual(IDLE));
  });

  it('reports unsupported straight away outside the desktop app', () => {
    desktop.hasDesktopBridge.mockReturnValue(false);

    const { result } = renderHook(() => useAppUpdate());

    expect(result.current.phase).toBe(UPDATE_PHASES.unsupported);
    expect(desktop.getUpdateState).not.toHaveBeenCalled();
  });

  it('follows changes from the main process', async () => {
    const { result } = renderHook(() => useAppUpdate());

    await waitFor(() => expect(result.current).toEqual(IDLE));

    const [notifyChange] = desktop.onUpdateStateChanged.mock.calls[0];

    act(() => notifyChange({ ...IDLE, phase: UPDATE_PHASES.ready }));

    expect(result.current.phase).toBe(UPDATE_PHASES.ready);
  });

  it('does not let a slow first load overwrite a newer change', async () => {
    let finishLoading = () => {};

    desktop.getUpdateState.mockReturnValue(
      new Promise((resolve) => {
        finishLoading = resolve;
      }),
    );

    const { result } = renderHook(() => useAppUpdate());
    const [notifyChange] = desktop.onUpdateStateChanged.mock.calls[0];

    act(() => notifyChange({ ...IDLE, phase: UPDATE_PHASES.checking }));
    await act(async () => finishLoading(IDLE));

    expect(result.current.phase).toBe(UPDATE_PHASES.checking);
  });

  it('falls back to unsupported if the state cannot be read', async () => {
    desktop.getUpdateState.mockRejectedValue(new Error('No handler'));

    const { result } = renderHook(() => useAppUpdate());

    await waitFor(() => expect(result.current?.phase).toBe(UPDATE_PHASES.unsupported));
  });
});
