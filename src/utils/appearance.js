import { accentFor, findTheme } from '@/constants/themes';

export const applyAppearance = (appearance) => {
  const rootElement = document.documentElement;
  const theme = findTheme(appearance.theme);

  rootElement.dataset.theme = theme.id;
  rootElement.dataset.accent = accentFor(appearance, theme.id);
};
