import { useContext, useEffect, useReducer, useState } from 'react';
import { getDownloadResolutions, getVideoResolutions } from '@/api/clients/desktopClient';
import { LocalFilesContext } from '@/context/LocalFilesContext';

const RESOLUTION_READERS = {
  libraryFiles: getVideoResolutions,
  finishedDownloads: getDownloadResolutions,
};

const NO_RESOLUTIONS = {};

const nextCount = (count) => count + 1;

const haveSameResolutions = (first, second) => JSON.stringify(first) === JSON.stringify(second);

export const useVideoResolutions = (filePaths, source = 'libraryFiles') => {
  const subscribeToRescans = useContext(LocalFilesContext)?.subscribeToRescans;

  const [resolutions, setResolutions] = useState(NO_RESOLUTIONS);
  const [refreshCount, refresh] = useReducer(nextCount, 0);

  const filePathsKey = JSON.stringify(filePaths);

  useEffect(() => {
    let isLatestRequest = true;

    RESOLUTION_READERS[source](JSON.parse(filePathsKey)).then(
      (latestResolutions) => {
        if (!isLatestRequest) return;

        setResolutions((currentResolutions) =>
          haveSameResolutions(currentResolutions, latestResolutions) ? currentResolutions : latestResolutions,
        );
      },
      () => {},
    );

    return () => {
      isLatestRequest = false;
    };
  }, [filePathsKey, refreshCount, source]);

  useEffect(() => subscribeToRescans?.(refresh), [subscribeToRescans]);

  return resolutions;
};
