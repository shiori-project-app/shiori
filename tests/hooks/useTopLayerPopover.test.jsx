import { cleanup, render } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useTopLayerPopover } from '@/hooks/useTopLayerPopover';

const originalMatches = HTMLElement.prototype.matches;

const popoverCalls = [];

const installPopoverApi = () => {
  HTMLElement.prototype.showPopover = function showPopover() {
    if (this.isPopoverOpen) throw new Error('InvalidStateError: already open');

    this.isPopoverOpen = true;
    popoverCalls.push('show');
  };

  HTMLElement.prototype.hidePopover = function hidePopover() {
    this.isPopoverOpen = false;
    popoverCalls.push('hide');
  };

  HTMLElement.prototype.matches = function matches(selector) {
    return selector === ':popover-open' ? Boolean(this.isPopoverOpen) : originalMatches.call(this, selector);
  };
};

const removePopoverApi = () => {
  delete HTMLElement.prototype.showPopover;
  delete HTMLElement.prototype.hidePopover;
  HTMLElement.prototype.matches = originalMatches;
};

const PopoverBox = ({ isShown, showKey }) => {
  const popoverRef = useRef(null);

  useTopLayerPopover(popoverRef, isShown, showKey);

  return <div ref={popoverRef} popover="manual" data-testid="popover" />;
};

const toggleEvent = (newState) => Object.assign(new Event('toggle'), { newState });

const openSomethingElse = () => {
  const dialog = document.createElement('dialog');

  document.body.append(dialog);
  dialog.dispatchEvent(toggleEvent('open'));
  dialog.remove();
};

describe('useTopLayerPopover', () => {
  beforeEach(() => {
    popoverCalls.length = 0;
    installPopoverApi();
  });

  afterEach(() => {
    cleanup();
    removePopoverApi();
  });

  it('opens while shown and closes when hidden', () => {
    const { rerender } = render(<PopoverBox isShown showKey={1} />);

    expect(popoverCalls).toEqual(['show']);

    rerender(<PopoverBox isShown={false} showKey={1} />);

    expect(popoverCalls).toEqual(['show', 'hide']);
  });

  it('hides before showing again for each new toast, since showing an open popover throws', () => {
    const { rerender } = render(<PopoverBox isShown showKey={1} />);

    rerender(<PopoverBox isShown showKey={2} />);

    expect(popoverCalls).toEqual(['show', 'hide', 'show']);
  });

  it('moves back on top when a dialog or popover opens over it', () => {
    render(<PopoverBox isShown showKey={1} />);

    openSomethingElse();

    expect(popoverCalls).toEqual(['show', 'hide', 'show']);
  });

  it('moves back on top when fullscreen starts', () => {
    render(<PopoverBox isShown showKey={1} />);

    document.dispatchEvent(new Event('fullscreenchange'));

    expect(popoverCalls).toEqual(['show', 'hide', 'show']);
  });

  it('ignores its own toggles and things closing', () => {
    const { getByTestId } = render(<PopoverBox isShown showKey={1} />);

    getByTestId('popover').dispatchEvent(toggleEvent('open'));
    document.body.dispatchEvent(toggleEvent('closed'));

    expect(popoverCalls).toEqual(['show']);
  });

  it('stops watching once hidden', () => {
    const { rerender } = render(<PopoverBox isShown showKey={1} />);

    rerender(<PopoverBox isShown={false} showKey={1} />);
    openSomethingElse();
    document.dispatchEvent(new Event('fullscreenchange'));

    expect(popoverCalls).toEqual(['show', 'hide']);
  });

  it('does nothing where the popover API is missing', () => {
    removePopoverApi();

    expect(() => render(<PopoverBox isShown showKey={1} />)).not.toThrow();
  });
});
