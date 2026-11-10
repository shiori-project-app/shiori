# Hooks: generic UI

- `useArrowKeySelection(optionIds, selectedId, onSelect)` returns a keydown handler for tab bars and segmented controls. It handles arrows, Home and End, and moves focus.
- `useOpenState()` returns `[isOpen, open, close]` with stable callbacks, for dialogs.
- `useSelectMenu({ value, onChange })` powers the popover-based `Select`: open state, keyboard navigation and type-to-jump.
- `useTopLayerPopover(elementRef, isShown, showKey)` opens a manual popover while shown and closes it when not. On each new `showKey`, and whenever another dialog, popover or fullscreen enters the top layer while it's shown, it hides and re-shows the popover so it stays on top.
- `useLiveAnnouncement()` returns `{ announcement, announce, clearAnnouncement }` for a live region. `announce(message)` empties the text, then sets it after `ANNOUNCEMENT_DELAY_MS` (100 ms), so screen readers see a change even when the same message repeats.
- `useOutsideClick(ref, isListening, onOutsideClick)` calls back on clicks outside an element while listening.
- `useHorizontalScroll()` returns a rail ref. It makes the vertical wheel scroll sideways, handling mice that report pixels, lines or one screen at a time, and reports hidden content before and after the view for the arrows.
- `useCarousel(slideCount, intervalMs)` returns an auto-advancing slide index:
  - It holds while `useReducedMotion` is true and picks up again if that changes.
  - `pauseHandlers` hold it while hovered or while keyboard focus is inside. A mouse click doesn't count, and a focused element that gets removed stops counting.
  - It holds while the window is hidden, and a manual pick stops it.
- `usePageVisible()` returns whether the window is visible, and updates when it's hidden or shown.
- `useInView(rootMargin)` returns `[ref, hasBeenNearViewport]`, used by `Deferred`.
- `useDebouncedValue(value, ms)` returns a value that updates after a pause.
