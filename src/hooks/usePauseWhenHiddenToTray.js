import { useEffect } from 'react';
import { onHiddenToTray } from '@/api/clients/desktopClient';

export const usePauseWhenHiddenToTray = (videoRef, pause) => {
  useEffect(
    () =>
      onHiddenToTray(() => {
        if (document.pictureInPictureElement !== videoRef.current) pause();
      }),
    [videoRef, pause],
  );
};
