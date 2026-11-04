import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createBackup } from '@/utils/backup';

const openBackupMock = vi.hoisted(() => vi.fn());
const autoBackupMock = vi.hoisted(() => vi.fn());
const restoreBackupDataMock = vi.hoisted(() => vi.fn());

vi.mock('@/api/clients/desktopClient', async (importOriginal) => ({
  ...(await importOriginal()),
  openBackup: openBackupMock,
  autoBackup: autoBackupMock,
}));

vi.mock('@/api/services/userDataStore', async (importOriginal) => ({
  ...(await importOriginal()),
  restoreBackupData: restoreBackupDataMock,
  snapshotForBackup: () => ({}),
}));

vi.mock('@/hooks/useLibrary', () => ({ useLibrary: () => ({ list: {}, watched: {} }) }));
vi.mock('@/hooks/useToast', () => ({ useToast: () => () => {} }));

const { BackupPanel } = await import('@/components/settings/BackupPanel');

const RESTORE_FAILURE = 'The disk is full.';

const never = () => new Promise(() => {});

const buttonNamed = (name) => screen.getByRole('button', { name, hidden: true });

const errorText = () => screen.queryByText(new RegExp(RESTORE_FAILURE));

const openConfirmationDialog = async () => {
  render(<BackupPanel />);
  fireEvent.click(buttonNamed('Restore…'));

  await screen.findByText('Restore this backup?');
};

const failRestore = async () => {
  await openConfirmationDialog();
  fireEvent.click(buttonNamed('Restore'));

  await screen.findByRole('alert', { hidden: true });
};

describe('BackupPanel restore errors', () => {
  beforeAll(() => {
    HTMLDialogElement.prototype.showModal ??= function showModal() {
      this.open = true;
    };
  });

  beforeEach(() => {
    openBackupMock.mockResolvedValue({ path: 'C:\\backup.json', text: createBackup({ list: {} }) });
    autoBackupMock.mockResolvedValue(undefined);
    restoreBackupDataMock.mockRejectedValue(new Error(RESTORE_FAILURE));
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('shows a failed restore inside the dialog, not behind it', async () => {
    await failRestore();

    expect(errorText().closest('dialog')).not.toBeNull();
    expect(screen.getAllByText(new RegExp(RESTORE_FAILURE))).toHaveLength(1);
  });

  it('lets the user leave once the restore has failed', async () => {
    await failRestore();

    expect(buttonNamed('Cancel').disabled).toBe(false);
  });

  it('drops the error when the dialog is cancelled', async () => {
    await failRestore();

    fireEvent.click(buttonNamed('Cancel'));

    await waitFor(() => expect(screen.queryByText('Restore this backup?')).toBeNull());
    expect(errorText()).toBeNull();
  });

  it('clears the error and locks the dialog while retrying', async () => {
    await failRestore();

    restoreBackupDataMock.mockImplementation(never);
    fireEvent.click(buttonNamed('Restore'));

    await waitFor(() => expect(buttonNamed('Cancel').disabled).toBe(true));
    expect(errorText()).toBeNull();
  });

  it('still shows an unreadable backup file in the panel, where no dialog opened', async () => {
    openBackupMock.mockResolvedValue({ path: 'C:\\notes.txt', text: 'not json' });

    render(<BackupPanel />);
    fireEvent.click(buttonNamed('Restore…'));

    const message = await screen.findByText(/isn’t a Shiori backup/);

    expect(message.closest('dialog')).toBeNull();
  });
});
