import { useEffect, useState } from 'react';
import { loadUserData } from '@/api/services/userDataStore';
import { useToast } from '@/hooks/useToast';

const LOAD_WARNING_TOAST_MS = 10000;
const LOADING = { status: 'loading', error: null };

export const useUserDataLoad = () => {
  const showToast = useToast();

  const [loadState, setLoadState] = useState(LOADING);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let isCurrentAttempt = true;

    loadUserData().then(
      ({ warnings }) => {
        if (!isCurrentAttempt) return;

        setLoadState({ status: 'ready', error: null });

        if (warnings.length) showToast(warnings.join(' '), LOAD_WARNING_TOAST_MS);
      },
      (error) => {
        if (isCurrentAttempt) setLoadState({ status: 'failed', error });
      },
    );

    return () => {
      isCurrentAttempt = false;
    };
  }, [attempt, showToast]);

  const retry = () => {
    setLoadState(LOADING);
    setAttempt((attemptCount) => attemptCount + 1);
  };

  return { ...loadState, retry };
};
