const CATPPUCCIN_ACCENTS = [
  'rosewater',
  'flamingo',
  'pink',
  'mauve',
  'red',
  'maroon',
  'peach',
  'yellow',
  'green',
  'teal',
  'sky',
  'sapphire',
  'blue',
  'lavender',
];

const TOKYO_ACCENTS = ['blue', 'cyan', 'magenta', 'purple', 'teal', 'green', 'yellow', 'orange', 'red'];
const ROSE_PINE_ACCENTS = ['rose', 'love', 'gold', 'pine', 'foam', 'iris'];
const NORD_ACCENTS = ['frost', 'sky', 'ocean', 'teal', 'green', 'yellow', 'orange', 'red', 'purple'];

export const THEME_FAMILIES = [
  {
    name: 'Shiori',

    themes: [
      {
        id: 'lunar-slate',
        label: 'Lunar Slate',
        description: 'Cool blue-grey',
        accents: ['moon', 'ice', 'slate', 'blue', 'teal', 'green', 'amber', 'rose', 'violet'],
        accent: 'moon',
      },

      {
        id: 'dark',
        label: 'Dark',
        description: 'Neutral charcoal',
        accents: ['violet', 'blue', 'pink', 'teal', 'green', 'amber', 'orange', 'red'],
        accent: 'violet',
      },

      {
        id: 'cyberpunk',
        label: 'Cyberpunk',
        description: 'Neon on black',
        accents: ['cyan', 'magenta', 'yellow', 'green', 'purple', 'orange'],
        accent: 'cyan',
      },
    ],
  },

  {
    name: 'Catppuccin',

    themes: [
      { id: 'latte', label: 'Latte', description: 'Light', accents: CATPPUCCIN_ACCENTS, accent: 'mauve' },
      { id: 'frappe', label: 'Frappé', description: 'Soft dark', accents: CATPPUCCIN_ACCENTS, accent: 'mauve' },
      { id: 'macchiato', label: 'Macchiato', description: 'Medium dark', accents: CATPPUCCIN_ACCENTS, accent: 'mauve' },
      { id: 'mocha', label: 'Mocha', description: 'Darkest', accents: CATPPUCCIN_ACCENTS, accent: 'mauve' },
    ],
  },

  {
    name: 'Tokyo Night',

    themes: [
      { id: 'tokyo-night', label: 'Night', description: 'Deep navy', accents: TOKYO_ACCENTS, accent: 'blue' },
      { id: 'tokyo-storm', label: 'Storm', description: 'Lighter navy', accents: TOKYO_ACCENTS, accent: 'blue' },
      { id: 'tokyo-moon', label: 'Moon', description: 'Soft and bright', accents: TOKYO_ACCENTS, accent: 'blue' },
      { id: 'tokyo-day', label: 'Day', description: 'Light', accents: TOKYO_ACCENTS, accent: 'blue' },
    ],
  },

  {
    name: 'Kanagawa',

    themes: [
      {
        id: 'kanagawa-wave',
        label: 'Wave',
        description: 'Ink and indigo',
        accents: ['blue', 'violet', 'sky', 'aqua', 'green', 'yellow', 'orange', 'pink', 'red'],
        accent: 'blue',
      },

      {
        id: 'kanagawa-dragon',
        label: 'Dragon',
        description: 'Warm charcoal',
        accents: ['red', 'orange', 'yellow', 'green', 'aqua', 'blue', 'violet', 'pink'],
        accent: 'red',
      },

      {
        id: 'kanagawa-lotus',
        label: 'Lotus',
        description: 'Light, rice paper',
        accents: ['blue', 'violet', 'aqua', 'green', 'yellow', 'orange', 'pink', 'red'],
        accent: 'blue',
      },
    ],
  },

  {
    name: 'Rosé Pine',

    themes: [
      { id: 'rose-pine', label: 'Main', description: 'Dark', accents: ROSE_PINE_ACCENTS, accent: 'rose' },
      { id: 'rose-pine-moon', label: 'Moon', description: 'Softer dark', accents: ROSE_PINE_ACCENTS, accent: 'rose' },
      { id: 'rose-pine-dawn', label: 'Dawn', description: 'Light', accents: ROSE_PINE_ACCENTS, accent: 'rose' },
    ],
  },

  {
    name: 'Dracula',

    themes: [
      {
        id: 'dracula',
        label: 'Dracula',
        description: 'Purple-grey and neon',
        accents: ['purple', 'pink', 'cyan', 'green', 'yellow', 'orange', 'red'],
        accent: 'purple',
      },
    ],
  },

  {
    name: 'Nord',

    themes: [
      { id: 'nord', label: 'Nord', description: 'Arctic dark', accents: NORD_ACCENTS, accent: 'frost' },
      { id: 'nord-light', label: 'Nord Light', description: 'Snow storm', accents: NORD_ACCENTS, accent: 'ocean' },
    ],
  },
];

export const THEMES = THEME_FAMILIES.flatMap((family) =>
  family.themes.map((theme) => ({ ...theme, family: family.name })),
);

const DEFAULT_THEME_ID = 'lunar-slate';

export const DEFAULT_APPEARANCE = { theme: DEFAULT_THEME_ID, accents: {} };

export const findTheme = (themeId) =>
  THEMES.find((theme) => theme.id === themeId) ?? THEMES.find((theme) => theme.id === DEFAULT_THEME_ID);

const legacyCatppuccinAccent = (appearance, theme) => (theme.family === 'Catppuccin' ? appearance.accent : undefined);

export const accentFor = (appearance, themeId) => {
  const theme = findTheme(themeId);
  const savedAccent = appearance.accents?.[theme.id] ?? legacyCatppuccinAccent(appearance, theme);

  return theme.accents.includes(savedAccent) ? savedAccent : theme.accent;
};

export const themeDisplayName = (theme) =>
  theme.family === theme.label ? theme.label : `${theme.family} ${theme.label}`;
