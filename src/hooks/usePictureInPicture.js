import { useCallback, useEffect, useMemo, useState } from 'react';
import { exitFullscreen } from '@/hooks/useFullscreen';

const ignorePictureInPictureRejection = () => {};

const isPictureInPictureSupported = () => Boolean(document.pictureInPictureEnabled);

export const usePictureInPicture = (videoRef) => {
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const video = videoRef.current;

    const markEntered = () => setIsActive(true);

    const markLeft = () => setIsActive(false);

    video.addEventListener('enterpictureinpicture', markEntered);
    video.addEventListener('leavepictureinpicture', markLeft);

    return () => {
      video.removeEventListener('enterpictureinpicture', markEntered);
      video.removeEventListener('leavepictureinpicture', markLeft);

      if (document.pictureInPictureElement === video) {
        document.exitPictureInPicture().catch(ignorePictureInPictureRejection);
      }
    };
  }, [videoRef]);

  const toggle = useCallback(() => {
    const video = videoRef.current;

    if (document.pictureInPictureElement === video) {
      document.exitPictureInPicture().catch(ignorePictureInPictureRejection);

      return;
    }

    if (!isPictureInPictureSupported()) return;

    exitFullscreen();
    video.requestPictureInPicture().catch(ignorePictureInPictureRejection);
  }, [videoRef]);

  return useMemo(() => ({ isSupported: isPictureInPictureSupported(), isActive, toggle }), [isActive, toggle]);
};
