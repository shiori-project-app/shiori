import { useCallback, useSyncExternalStore } from 'react';
import { useInertOutside } from '@/hooks/useInertOutside';

const ignoreFullscreenRejection = () => {};

const isAppFullscreen = () => Boolean(document.fullscreenElement);

const subscribeToFullscreen = (onChange) => {
  document.addEventListener('fullscreenchange', onChange);

  return () => document.removeEventListener('fullscreenchange', onChange);
};

export const exitFullscreen = () => {
  if (isAppFullscreen()) document.exitFullscreen().catch(ignoreFullscreenRejection);
};

export const useFullscreen = (elementRef) => {
  const isFullscreen = useSyncExternalStore(subscribeToFullscreen, isAppFullscreen);

  useInertOutside(elementRef, isFullscreen);

  const toggleFullscreen = useCallback(() => {
    if (isFullscreen) exitFullscreen();
    else document.documentElement.requestFullscreen().catch(ignoreFullscreenRejection);
  }, [isFullscreen]);

  return { isFullscreen, toggleFullscreen };
};
