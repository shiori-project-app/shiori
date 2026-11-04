import { createContext, useCallback, useEffect, useMemo } from 'react';
import { accentFor, DEFAULT_APPEARANCE, findTheme } from '@/constants/themes';
import { usePersistentState } from '@/hooks/usePersistentState';
import { applyAppearance } from '@/utils/appearance';

export const AppearanceContext = createContext(null);

export const AppearanceProvider = ({ children }) => {
  const [appearance, setAppearance] = usePersistentState('appearance', DEFAULT_APPEARANCE);

  useEffect(() => {
    applyAppearance(appearance);
  }, [appearance]);

  const setTheme = useCallback((themeId) => setAppearance((saved) => ({ ...saved, theme: themeId })), [setAppearance]);

  const setAccent = useCallback(
    (accent) =>
      setAppearance((saved) => {
        const themeId = findTheme(saved.theme).id;

        return { ...saved, accents: { ...saved.accents, [themeId]: accent } };
      }),
    [setAppearance],
  );

  const value = useMemo(() => {
    const activeTheme = findTheme(appearance.theme);

    return {
      theme: activeTheme.id,
      accent: accentFor(appearance, activeTheme.id),
      accentForTheme: (themeId) => accentFor(appearance, themeId),
      setTheme,
      setAccent,
    };
  }, [appearance, setTheme, setAccent]);

  return <AppearanceContext value={value}>{children}</AppearanceContext>;
};
