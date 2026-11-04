import { createContext, useCallback, useEffect, useMemo } from 'react';
import { DEFAULT_PREFERENCES, PREFERENCES_KEY } from '@/constants/preferences';
import { usePersistentState } from '@/hooks/usePersistentState';
import { applyReduceMotion } from '@/utils/motion';

export const PreferencesContext = createContext(null);

export const PreferencesProvider = ({ children }) => {
  const [storedPreferences, setStoredPreferences] = usePersistentState(PREFERENCES_KEY, DEFAULT_PREFERENCES);

  const setPreference = useCallback(
    (name, value) => setStoredPreferences((saved) => ({ ...DEFAULT_PREFERENCES, ...saved, [name]: value })),
    [setStoredPreferences],
  );

  const value = useMemo(
    () => ({ ...DEFAULT_PREFERENCES, ...storedPreferences, setPreference }),
    [storedPreferences, setPreference],
  );

  useEffect(() => {
    applyReduceMotion(value.reduceMotion);
  }, [value.reduceMotion]);

  return <PreferencesContext value={value}>{children}</PreferencesContext>;
};
