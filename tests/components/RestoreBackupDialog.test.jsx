import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { RestoreBackupDialog } from '@/components/settings/RestoreBackupDialog';

const BACKUP = {
  path: 'C:\\backups\\shiori-backup.json',
  exportedAt: '2026-11-04T12:00:00.000Z',
  summary: { list: 3, watchedShows: 2, history: 5, notes: 1, tracked: 0 },
};

const renderDialog = (isRestoring) => {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();

  render(<RestoreBackupDialog backup={BACKUP} isRestoring={isRestoring} onConfirm={onConfirm} onCancel={onCancel} />);

  return { onConfirm, onCancel };
};

const buttonNamed = (name) => screen.getByRole('button', { name, hidden: true });

describe('RestoreBackupDialog', () => {
  beforeAll(() => {
    HTMLDialogElement.prototype.showModal ??= function showModal() {
      this.open = true;
    };
  });

  afterEach(cleanup);

  it('can be cancelled before the restore starts', () => {
    const { onCancel } = renderDialog(false);

    fireEvent.click(buttonNamed('Cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('starts the restore when confirmed', () => {
    const { onConfirm } = renderDialog(false);

    fireEvent.click(buttonNamed('Restore'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('offers no way out while restoring, because the restore cannot be stopped', () => {
    const { onCancel } = renderDialog(true);
    const dialog = screen.getByText('Restore this backup?').closest('dialog');

    expect(buttonNamed('Cancel').disabled).toBe(true);
    expect(buttonNamed('Close').disabled).toBe(true);
    expect(dialog.getAttribute('closedby')).toBe('none');

    fireEvent.click(buttonNamed('Cancel'));
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('shows no error until a restore has failed', () => {
    renderDialog(false);

    expect(screen.queryByRole('alert', { hidden: true })).toBeNull();
  });

  it('shows why a restore failed', () => {
    render(
      <RestoreBackupDialog
        backup={BACKUP}
        isRestoring={false}
        errorMessage="The disk is full."
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );

    expect(screen.getByRole('alert', { hidden: true }).textContent).toBe(
      'Couldn’t restore this backup. The disk is full.',
    );
  });

  it('can be cancelled again after a failed restore', () => {
    const onCancel = vi.fn();

    const { rerender } = render(
      <RestoreBackupDialog backup={BACKUP} isRestoring onConfirm={() => {}} onCancel={onCancel} />,
    );

    rerender(<RestoreBackupDialog backup={BACKUP} isRestoring={false} onConfirm={() => {}} onCancel={onCancel} />);

    const dialog = screen.getByText('Restore this backup?').closest('dialog');

    expect(dialog.hasAttribute('closedby')).toBe(false);

    fireEvent.click(buttonNamed('Cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
