import fs from 'node:fs';
import path from 'node:path';
import * as sass from 'sass';
import { describe, expect, it } from 'vitest';
import { accentFor, DEFAULT_APPEARANCE, findTheme, THEMES } from '@/constants/themes';

const MAIN_STYLESHEET = path.resolve('src/styles/main.scss');
const css = sass.compile(MAIN_STYLESHEET).css.replace(/['"]/g, '');

describe('themes', () => {
  it.each(THEMES.map((theme) => [theme.id, theme]))('%s has its CSS rules', (id, theme) => {
    expect(css).toContain(`[data-theme=${id}]`);

    for (const accent of theme.accents ?? []) {
      expect(css, `accent ${accent}`).toContain(`[data-theme=${id}][data-accent=${accent}]`);
    }

    if (theme.accents) expect(theme.accents).toContain(theme.accent);
  });

  it('keeps the old single Catppuccin accent and falls back to the default theme', () => {
    expect(accentFor({ theme: 'mocha', accent: 'blue' }, 'mocha')).toBe('blue');
    expect(accentFor({ theme: 'nord', accent: 'blue' }, 'nord')).toBe('frost');
    expect(accentFor({ theme: 'nord', accents: { nord: 'purple' } }, 'nord')).toBe('purple');
    expect(accentFor({ theme: 'shiori', accents: {} }, 'shiori')).toBe('moon');
  });

  it('starts on the default theme before any script runs', () => {
    const page = fs.readFileSync(path.resolve('index.html'), 'utf8');
    const defaultTheme = findTheme(DEFAULT_APPEARANCE.theme);

    expect(page).toContain(`data-theme="${defaultTheme.id}" data-accent="${defaultTheme.accent}"`);
  });
});
