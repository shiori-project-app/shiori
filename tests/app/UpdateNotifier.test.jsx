import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UPDATE_PHASES } from '@shared/updatePhases';

const useAppUpdateMock = vi.hoisted(() => vi.fn());
const showToast = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/useAppUpdate', () => ({ useAppUpdate: useAppUpdateMock }));
vi.mock('@/hooks/useToast', () => ({ useToast: () => showToast }));

const { UpdateNotifier } = await import('@/app/UpdateNotifier');

const READY = { phase: UPDATE_PHASES.ready, availableVersion: '1.1.0' };

const setPageVisibility = (visibilityState) =>
  Object.defineProperty(document, 'visibilityState', { value: visibilityState, configurable: true });

describe('UpdateNotifier', () => {
  beforeEach(() => {
    showToast.mockReset();
    setPageVisibility('visible');
  });

  afterEach(cleanup);

  it('waits while the update state is loading', () => {
    useAppUpdateMock.mockReturnValue(null);
    render(<UpdateNotifier />);

    expect(showToast).not.toHaveBeenCalled();
  });

  it('saves the message until the window is shown, so one hidden in the tray does not miss it', () => {
    setPageVisibility('hidden');
    useAppUpdateMock.mockReturnValue(READY);
    render(<UpdateNotifier />);
    expect(showToast).not.toHaveBeenCalled();

    setPageVisibility('visible');
    act(() => document.dispatchEvent(new Event('visibilitychange')));

    expect(showToast).toHaveBeenCalledTimes(1);
  });

  it('says nothing until an update is ready', () => {
    useAppUpdateMock.mockReturnValue({ phase: UPDATE_PHASES.downloading, availableVersion: '1.1.0' });
    render(<UpdateNotifier />);

    expect(showToast).not.toHaveBeenCalled();
  });

  it('announces an update that is waiting to be downloaded', () => {
    useAppUpdateMock.mockReturnValue({ phase: UPDATE_PHASES.available, availableVersion: '1.1.0' });
    render(<UpdateNotifier />);

    expect(showToast.mock.calls[0][0]).toContain('Shiori 1.1.0 is available');
  });

  it('announces the same version again once it has been downloaded', () => {
    useAppUpdateMock.mockReturnValue({ phase: UPDATE_PHASES.available, availableVersion: '1.1.0' });

    const { rerender } = render(<UpdateNotifier />);

    useAppUpdateMock.mockReturnValue(READY);
    rerender(<UpdateNotifier />);

    expect(showToast).toHaveBeenCalledTimes(2);
  });

  it('announces a ready update once, however often the state repeats', () => {
    useAppUpdateMock.mockReturnValue(READY);

    const { rerender } = render(<UpdateNotifier />);

    useAppUpdateMock.mockReturnValue({ ...READY });
    rerender(<UpdateNotifier />);

    expect(showToast).toHaveBeenCalledTimes(1);
    expect(showToast.mock.calls[0][0]).toContain('Shiori 1.1.0 is ready');
  });
});
