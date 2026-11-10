import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Modal } from '@/components/common/Modal';
import { Toast } from '@/components/common/Toast';
import { TOAST_MS } from '@/config/app.config';
import { ToastProvider } from '@/context/ToastContext';
import { ANNOUNCEMENT_DELAY_MS } from '@/hooks/useLiveAnnouncement';
import { useToast } from '@/hooks/useToast';

const ToastTrigger = ({ withDialog = false }) => {
  const showToast = useToast();

  return (
    <>
      <button type="button" onClick={() => showToast('Added to My List')}>
        Add
      </button>

      {withDialog && <Modal title="Download season">Panel</Modal>}
    </>
  );
};

const renderWithToasts = (ui) => render(<ToastProvider>{ui}</ToastProvider>);

const clickAdd = () => act(() => screen.getByRole('button', { name: 'Add', hidden: true }).click());

const waitFor = (milliseconds) => act(() => vi.advanceTimersByTime(milliseconds));

const announcementsIn = (container) =>
  [...container.ownerDocument.querySelectorAll('[role="status"][aria-live]')].map((region) => ({
    insideDialog: Boolean(region.closest('dialog')),
    text: region.textContent,
  }));

const announcementOutsideDialogs = (container) =>
  announcementsIn(container).find((region) => !region.insideDialog).text;

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('is a manual popover, hidden from screen readers so the text isn’t read twice', () => {
    const { container } = render(<Toast message="Saved" visible shownCount={1} />);
    const popover = container.querySelector('.toast');

    expect(popover.getAttribute('popover')).toBe('manual');
    expect(popover.getAttribute('aria-hidden')).toBe('true');
  });

  it('announces the toast through a live region a moment after it appears', () => {
    const { container } = renderWithToasts(<ToastTrigger />);

    clickAdd();
    expect(announcementOutsideDialogs(container)).toBe('');

    waitFor(ANNOUNCEMENT_DELAY_MS);
    expect(announcementOutsideDialogs(container)).toBe('Added to My List');
  });

  it('also announces it inside an open dialog, where the region outside is inert and silent', () => {
    const { container } = renderWithToasts(<ToastTrigger withDialog />);

    clickAdd();
    waitFor(ANNOUNCEMENT_DELAY_MS);

    expect(announcementsIn(container)).toContainEqual({ insideDialog: true, text: 'Added to My List' });
  });

  it('clears the announcement when the toast goes', () => {
    const { container } = renderWithToasts(<ToastTrigger />);

    clickAdd();
    waitFor(ANNOUNCEMENT_DELAY_MS);
    expect(announcementOutsideDialogs(container)).toBe('Added to My List');

    waitFor(TOAST_MS);
    expect(announcementOutsideDialogs(container)).toBe('');
  });

  it('announces the same message again when it repeats while still on screen', () => {
    const { container } = renderWithToasts(<ToastTrigger />);

    clickAdd();
    waitFor(ANNOUNCEMENT_DELAY_MS);

    clickAdd();
    expect(announcementOutsideDialogs(container)).toBe('');

    waitFor(ANNOUNCEMENT_DELAY_MS);
    expect(announcementOutsideDialogs(container)).toBe('Added to My List');
  });
});
