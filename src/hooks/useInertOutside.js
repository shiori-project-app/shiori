import { useEffect } from 'react';

const LIVE_REGION = '[aria-live], [role="status"], [role="alert"]';

const siblingsOf = (element) => [...element.parentElement.children].filter((sibling) => sibling !== element);

const elementsOutside = (element) => {
  if (!element?.parentElement || element.parentElement === document.documentElement) return [];

  return [...siblingsOf(element), ...elementsOutside(element.parentElement)];
};

const canBeMadeInert = (element) => !element.inert && !element.matches(LIVE_REGION);

export const useInertOutside = (elementRef, isActive) => {
  useEffect(() => {
    if (!isActive) return;

    const madeInert = elementsOutside(elementRef.current).filter(canBeMadeInert);

    madeInert.forEach((element) => {
      element.inert = true;
    });

    return () =>
      madeInert.forEach((element) => {
        element.inert = false;
      });
  }, [elementRef, isActive]);
};
