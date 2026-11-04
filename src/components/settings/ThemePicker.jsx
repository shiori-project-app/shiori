import { memo } from 'react';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { THEME_FAMILIES } from '@/constants/themes';
import { useAppearance } from '@/hooks/useAppearance';
import { useArrowKeySelection } from '@/hooks/useArrowKeySelection';
import { cx } from '@/utils/classNames';

const THEME_IDS = THEME_FAMILIES.flatMap((family) => family.themes.map((theme) => theme.id));

const ThemePreviewCard = memo(({ theme, accent, isActive, onSelect }) => (
  <button
    type="button"
    role="radio"
    className={cx('theme-card', isActive && 'is-active')}
    data-theme={theme.id}
    data-accent={accent}
    aria-checked={isActive}
    tabIndex={isActive ? 0 : -1}
    onClick={() => onSelect(theme.id)}
  >
    <span className="theme-card__preview" aria-hidden="true">
      <span className="theme-card__panel">
        <i />
        <i />
      </span>

      <span className="theme-card__dot" />
    </span>

    <span className="theme-card__name">{theme.label}</span>
    <span className="theme-card__description">{theme.description}</span>
  </button>
));

export const ThemePicker = () => {
  const { theme: activeThemeId, accentForTheme, setTheme } = useAppearance();
  const selectWithArrowKeys = useArrowKeySelection(THEME_IDS, activeThemeId, setTheme);

  return (
    <SettingsSection title="Theme">
      <div role="radiogroup" aria-label="Theme" onKeyDown={selectWithArrowKeys}>
        {THEME_FAMILIES.map((family) => (
          <div key={family.name} className="theme-family">
            <h3 className="theme-family__name">{family.name}</h3>

            <div className="theme-grid">
              {family.themes.map((theme) => (
                <ThemePreviewCard
                  key={theme.id}
                  theme={theme}
                  accent={accentForTheme(theme.id)}
                  isActive={theme.id === activeThemeId}
                  onSelect={setTheme}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </SettingsSection>
  );
};
