import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { Modal } from '@/components/common/Modal';

const RIGHT_MOUSE_BUTTON = 2;

const renderModal = (props = {}) => {
  render(
    <Modal title="Link your files" onClose={() => {}} {...props}>
      <p>Some text to copy</p>
    </Modal>,
  );

  const panelText = screen.getByText('Some text to copy');
  const dialog = panelText.closest('dialog');

  dialog.close = vi.fn();

  return { dialog, panelText };
};

const drag = (pressedElement, releasedElement, options = {}) => {
  fireEvent.mouseDown(pressedElement, options);
  fireEvent.mouseUp(releasedElement, options);
};

describe('Modal', () => {
  beforeAll(() => {
    HTMLDialogElement.prototype.showModal ??= function showModal() {
      this.open = true;
    };
  });

  afterEach(cleanup);

  it('closes when clicked outside the panel', () => {
    const { dialog } = renderModal();

    drag(dialog, dialog);
    expect(dialog.close).toHaveBeenCalledTimes(1);
  });

  it('stays open when selecting text ends outside the panel', () => {
    const { dialog, panelText } = renderModal();

    drag(panelText, dialog);
    expect(dialog.close).not.toHaveBeenCalled();
  });

  it('stays open when a drag starts outside the panel and ends inside it', () => {
    const { dialog, panelText } = renderModal();

    drag(dialog, panelText);
    expect(dialog.close).not.toHaveBeenCalled();
  });

  it('stays open on a right click outside the panel', () => {
    const { dialog } = renderModal();

    drag(dialog, dialog, { button: RIGHT_MOUSE_BUTTON });
    expect(dialog.close).not.toHaveBeenCalled();
  });

  it('closes with its close button', () => {
    const { dialog } = renderModal();

    fireEvent.click(screen.getByRole('button', { name: 'Close', hidden: true }));
    expect(dialog.close).toHaveBeenCalledTimes(1);
  });

  it('leaves Esc working by default', () => {
    const { dialog } = renderModal();

    expect(dialog.hasAttribute('closedby')).toBe(false);
  });

  describe('when not dismissible', () => {
    it('stays open when clicked outside the panel', () => {
      const { dialog } = renderModal({ dismissible: false });

      drag(dialog, dialog);
      expect(dialog.close).not.toHaveBeenCalled();
    });

    it('disables its close button', () => {
      const { dialog } = renderModal({ dismissible: false });
      const closeButton = screen.getByRole('button', { name: 'Close', hidden: true });

      expect(closeButton.disabled).toBe(true);
      fireEvent.click(closeButton);
      expect(dialog.close).not.toHaveBeenCalled();
    });

    it('asks the browser to ignore Esc', () => {
      const { dialog } = renderModal({ dismissible: false });

      expect(dialog.getAttribute('closedby')).toBe('none');
    });
  });
});
