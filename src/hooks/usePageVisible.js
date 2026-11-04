import { useSyncExternalStore } from 'react';

const subscribeToVisibility = (onChange) => {
  document.addEventListener('visibilitychange', onChange);

  return () => document.removeEventListener('visibilitychange', onChange);
};

const isPageVisible = () => document.visibilityState === 'visible';

export const usePageVisible = () => useSyncExternalStore(subscribeToVisibility, isPageVisible);
