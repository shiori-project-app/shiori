import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { CLEANUP_PHASES } from '@/hooks/useWatchedCleanup';

vi.mock('@/hooks/usePreferences', () => ({ useDisplayTitle: () => (series) => series.title }));
vi.mock('@/hooks/useTracking', () => ({ useTracking: () => ({}) }));
vi.mock('@/hooks/useLibrary', () => ({ useLibrary: () => ({}) }));

const { WatchedCleanupDialog } = await import('@/components/settings/WatchedCleanupDialog');

const GIGABYTE = 1024 ** 3;

const candidate = (overrides) => ({
  path: 'Frieren\\Frieren - 01.mkv',
  name: 'Frieren - 01.mkv',
  series: { title: 'Frieren' },
  episodeNumber: 1,
  bytes: GIGABYTE,
  watchedAt: Date.UTC(2026, 8, 1),
  isConfident: true,
  ...overrides,
});

const SURE = candidate();

const UNSURE = candidate({
  path: 'Naruto Shippuden - 05.mkv',
  name: 'Naruto Shippuden - 05.mkv',
  series: { title: 'Naruto' },
  episodeNumber: 5,
  isConfident: false,
});

const renderDialog = (overrides = {}) => {
  const handlers = { onToggle: vi.fn(), onConfirm: vi.fn(), onClose: vi.fn() };

  render(
    <WatchedCleanupDialog
      review={{ candidates: [SURE, UNSURE], skippedShows: 0 }}
      selectedPaths={new Set([SURE.path])}
      phase={CLEANUP_PHASES.reviewing}
      cleanedCount={0}
      outcome={null}
      action="trash"
      moveFolder={null}
      trashName="Recycle Bin"
      afterDays={30}
      {...handlers}
      {...overrides}
    />,
  );

  return handlers;
};

const buttonNamed = (name) => screen.getByRole('button', { name, hidden: true });

const checkboxes = () => screen.getAllByRole('checkbox', { hidden: true });

describe('WatchedCleanupDialog', () => {
  beforeAll(() => {
    HTMLDialogElement.prototype.showModal ??= function showModal() {
      this.open = true;
    };
  });

  afterEach(cleanup);

  it('names the exact file for each episode', () => {
    renderDialog();

    expect(screen.getByText('Frieren · EP 1')).toBeTruthy();
    expect(screen.getByText(SURE.name)).toBeTruthy();
    expect(screen.getByText(UNSURE.name)).toBeTruthy();
  });

  it('warns about a partial match and leaves it unticked', () => {
    renderDialog();

    const [sureBox, unsureBox] = checkboxes();

    expect(sureBox.checked).toBe(true);
    expect(unsureBox.checked).toBe(false);

    const unsureRow = screen.getByText(UNSURE.name).closest('li');

    expect(within(unsureRow).getByText(/only partly matches/)).toBeTruthy();
    expect(within(screen.getByText(SURE.name).closest('li')).queryByText(/only partly matches/)).toBeNull();
  });

  it('counts only the ticked files on the confirm button', () => {
    renderDialog();

    expect(buttonNamed('Send 1 episode to the Recycle Bin (1.00 GB)')).toBeTruthy();
  });

  it('asks to toggle a file by its path', () => {
    const { onToggle } = renderDialog();

    fireEvent.click(checkboxes()[1]);
    expect(onToggle).toHaveBeenCalledExactlyOnceWith(UNSURE.path);
  });

  it('won’t confirm with nothing ticked', () => {
    renderDialog({ selectedPaths: new Set() });

    expect(buttonNamed('Send 0 episodes to the Recycle Bin (0 KB)').disabled).toBe(true);
  });

  it('touches nothing until confirmed', () => {
    const { onConfirm, onClose } = renderDialog();

    expect(onConfirm).not.toHaveBeenCalled();

    fireEvent.click(buttonNamed('Cancel'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('uses the name the system gives its trash', () => {
    renderDialog({ trashName: 'Trash' });

    expect(buttonNamed('Send 1 episode to the Trash (1.00 GB)')).toBeTruthy();
    expect(screen.getByText(/They go to the Trash/)).toBeTruthy();
  });

  it('says the Recycle Bin keeps the disk space until it is emptied', () => {
    renderDialog();

    expect(screen.getByText(/disk space only comes back once you empty it/)).toBeTruthy();
  });

  it('names the destination when moving', () => {
    renderDialog({ action: 'move', moveFolder: 'E:\\Archive' });

    expect(buttonNamed('Move 1 episode (1.00 GB)')).toBeTruthy();
    expect(screen.getByText(/They move to E:\\Archive/)).toBeTruthy();
  });

  it('can’t be closed or changed while running, and shows progress', () => {
    renderDialog({ phase: CLEANUP_PHASES.cleaning, cleanedCount: 0, selectedPaths: new Set([SURE.path, UNSURE.path]) });

    expect(buttonNamed('Working on 1 of 2…').disabled).toBe(true);
    expect(buttonNamed('Cancel').disabled).toBe(true);
    expect(buttonNamed('Close').disabled).toBe(true);
    expect(screen.getByText('Clean up watched episodes').closest('dialog').getAttribute('closedby')).toBe('none');
    expect(checkboxes().every((box) => box.disabled)).toBe(true);
  });

  it('says when there’s nothing to clean up', () => {
    renderDialog({ review: { candidates: [], skippedShows: 0 }, selectedPaths: new Set() });

    expect(screen.getByText(/Nothing to clean up/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Recycle Bin/, hidden: true })).toBeNull();
  });

  it('says when shows were left out', () => {
    renderDialog({ review: { candidates: [SURE], skippedShows: 2 } });

    expect(screen.getByText(/2 shows left out/)).toBeTruthy();
  });

  it('reports what was cleaned, what failed and why', () => {
    renderDialog({
      phase: CLEANUP_PHASES.finished,

      outcome: {
        cleaned: [{ candidate: SURE, bytes: GIGABYTE }],
        failed: [{ candidate: UNSURE, failure: 'It’s open in another app.' }],
      },
    });

    expect(screen.getByText('Sent 1 episode to the Recycle Bin (1.00 GB).')).toBeTruthy();
    expect(screen.getByRole('alert', { hidden: true }).textContent).toMatch('1 episode couldn’t be cleaned up');
    expect(screen.getByText(UNSURE.name).closest('li').textContent).toContain('It’s open in another app.');
  });
});
