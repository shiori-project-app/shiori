import { useCallback, useContext, useMemo, useSyncExternalStore } from 'react';
import { PreferencesContext } from '@/context/PreferencesContext';
import { subscribeToSystemMotion, systemPrefersReducedMotion } from '@/utils/motion';
import { displayTitle } from '@/utils/titles';

export const usePreferences = () => useContext(PreferencesContext);

export const useDisplayTitle = () => {
  const { titleLanguage } = usePreferences();

  return useCallback((series) => displayTitle(series, titleLanguage), [titleLanguage]);
};

export const useContentFilter = () => {
  const { hideEcchi } = usePreferences();

  return useMemo(() => ({ hideEcchi }), [hideEcchi]);
};

export const useSystemReducesMotion = () => useSyncExternalStore(subscribeToSystemMotion, systemPrefersReducedMotion);

export const useReducedMotion = () => {
  const { reduceMotion } = usePreferences();
  const systemReducesMotion = useSystemReducesMotion();

  return reduceMotion || systemReducesMotion;
};

export const useTogglePreference = (name) => {
  const { [name]: isEnabled, setPreference } = usePreferences();

  return [isEnabled, () => setPreference(name, !isEnabled)];
};
