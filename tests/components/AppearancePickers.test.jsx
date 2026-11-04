import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { THEME_FAMILIES } from '@/constants/themes';

const useAppearanceMock = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/useAppearance', () => ({ useAppearance: useAppearanceMock }));

const { AccentPicker } = await import('@/components/settings/AccentPicker');
const { ThemePicker } = await import('@/components/settings/ThemePicker');

const ALL_THEME_IDS = THEME_FAMILIES.flatMap((family) => family.themes.map((theme) => theme.id));

const renderPickerWith = (Picker, appearance) => {
  const setTheme = vi.fn();
  const setAccent = vi.fn();

  useAppearanceMock.mockReturnValue({ accentForTheme: () => 'violet', setTheme, setAccent, ...appearance });
  render(<Picker />);

  return { setTheme, setAccent };
};

const tabStops = () => screen.getAllByRole('radio').filter((option) => option.tabIndex === 0);

describe('ThemePicker keyboard use', () => {
  afterEach(() => {
    cleanup();
    useAppearanceMock.mockReset();
  });

  it('is one Tab stop, on the active theme', () => {
    const activeThemeId = ALL_THEME_IDS[2];

    renderPickerWith(ThemePicker, { theme: activeThemeId, accent: 'violet' });
    expect(tabStops()).toHaveLength(1);
    expect(tabStops()[0].getAttribute('data-theme')).toBe(activeThemeId);
    expect(tabStops()[0].getAttribute('aria-checked')).toBe('true');
  });

  it('moves across theme families with the arrow keys', () => {
    const lastThemeOfFirstFamily = THEME_FAMILIES[0].themes.at(-1).id;
    const firstThemeOfSecondFamily = THEME_FAMILIES[1].themes[0].id;
    const { setTheme } = renderPickerWith(ThemePicker, { theme: lastThemeOfFirstFamily, accent: 'violet' });

    fireEvent.keyDown(tabStops()[0], { key: 'ArrowRight' });
    expect(setTheme).toHaveBeenCalledWith(firstThemeOfSecondFamily);
    expect(document.activeElement.getAttribute('data-theme')).toBe(firstThemeOfSecondFamily);
  });

  it('jumps to the first and last theme with Home and End', () => {
    const { setTheme } = renderPickerWith(ThemePicker, { theme: ALL_THEME_IDS[1], accent: 'violet' });

    fireEvent.keyDown(tabStops()[0], { key: 'End' });
    expect(setTheme).toHaveBeenLastCalledWith(ALL_THEME_IDS.at(-1));
    fireEvent.keyDown(tabStops()[0], { key: 'Home' });
    expect(setTheme).toHaveBeenLastCalledWith(ALL_THEME_IDS[0]);
  });

  it('lets Tab leave the group', () => {
    const { setTheme } = renderPickerWith(ThemePicker, { theme: ALL_THEME_IDS[0], accent: 'violet' });

    fireEvent.keyDown(tabStops()[0], { key: 'Tab' });
    expect(setTheme).not.toHaveBeenCalled();
  });
});

describe('AccentPicker keyboard use', () => {
  const themeWithAccents = THEME_FAMILIES.flatMap((family) => family.themes).find((theme) => theme.accents.length > 2);
  const [firstAccent, secondAccent] = themeWithAccents.accents;

  afterEach(() => {
    cleanup();
    useAppearanceMock.mockReset();
  });

  it('is one Tab stop, on the active accent', () => {
    renderPickerWith(AccentPicker, { theme: themeWithAccents.id, accent: secondAccent });
    expect(tabStops()).toHaveLength(1);
    expect(tabStops()[0].getAttribute('data-accent')).toBe(secondAccent);
  });

  it('wraps around with the arrow keys', () => {
    const { setAccent } = renderPickerWith(AccentPicker, { theme: themeWithAccents.id, accent: firstAccent });

    fireEvent.keyDown(tabStops()[0], { key: 'ArrowLeft' });
    expect(setAccent).toHaveBeenCalledWith(themeWithAccents.accents.at(-1));
  });
});
