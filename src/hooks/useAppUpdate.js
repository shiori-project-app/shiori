import { useEffect, useState } from 'react';
import { getUpdateState, hasDesktopBridge, onUpdateStateChanged } from '@/api/clients/desktopClient';
import { UPDATE_PHASES } from '@shared/updatePhases';

const UNSUPPORTED_STATE = {
  phase: UPDATE_PHASES.unsupported,
  currentVersion: null,
  availableVersion: null,
  downloadPercent: 0,
};

export const useAppUpdate = () => {
  const [update, setUpdate] = useState(() => (hasDesktopBridge() ? null : UNSUPPORTED_STATE));

  useEffect(() => {
    if (!hasDesktopBridge()) return undefined;

    const keepNewerState = (loadedState) => setUpdate((current) => current ?? loadedState);

    getUpdateState()
      .then(keepNewerState)
      .catch(() => keepNewerState(UNSUPPORTED_STATE));

    return onUpdateStateChanged(setUpdate);
  }, []);

  return update;
};
