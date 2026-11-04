import { useSyncExternalStore } from 'react';

const subscribeToConnectivity = (onChange) => {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);

  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
};

const readOnlineStatus = () => navigator.onLine;

export const useOnlineStatus = () => useSyncExternalStore(subscribeToConnectivity, readOnlineStatus);
