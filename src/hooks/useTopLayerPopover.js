import { useEffect } from 'react';

const supportsPopover = (element) => typeof element?.showPopover === 'function';

const isOpen = (element) => element.matches(':popover-open');

const showOnTop = (element) => {
  if (isOpen(element)) element.hidePopover();

  element.showPopover();
};

const opensAnotherTopLayerElement = (event, element) => event.target !== element && event.newState === 'open';

export const useTopLayerPopover = (elementRef, isShown, showKey) => {
  useEffect(() => {
    const element = elementRef.current;

    if (!supportsPopover(element)) return;

    if (!isShown) {
      if (isOpen(element)) element.hidePopover();

      return;
    }

    showOnTop(element);

    const stayAboveNewTopLayerElement = (event) => {
      if (opensAnotherTopLayerElement(event, element)) showOnTop(element);
    };

    const stayAboveFullscreen = () => showOnTop(element);

    document.addEventListener('toggle', stayAboveNewTopLayerElement, true);
    document.addEventListener('fullscreenchange', stayAboveFullscreen);

    return () => {
      document.removeEventListener('toggle', stayAboveNewTopLayerElement, true);
      document.removeEventListener('fullscreenchange', stayAboveFullscreen);
    };
  }, [elementRef, isShown, showKey]);
};
