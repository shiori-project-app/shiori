import { useCallback } from 'react';

const ignoreFullscreenRejection = () => {};

export const exitFullscreen = () => {
  if (document.fullscreenElement) document.exitFullscreen().catch(ignoreFullscreenRejection);
};

export const useFullscreen = (elementRef) =>
  useCallback(() => {
    if (document.fullscreenElement) exitFullscreen();
    else elementRef.current.requestFullscreen().catch(ignoreFullscreenRejection);
  }, [elementRef]);
