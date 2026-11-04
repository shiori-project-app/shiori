import { SettingsSection } from '@/components/settings/SettingsSection';
import { findTheme, themeDisplayName } from '@/constants/themes';
import { useAppearance } from '@/hooks/useAppearance';
import { useArrowKeySelection } from '@/hooks/useArrowKeySelection';
import { cx } from '@/utils/classNames';
import { capitalize } from '@/utils/format';

export const AccentPicker = () => {
  const { theme: activeThemeId, accent: activeAccent, setAccent } = useAppearance();

  const activeTheme = findTheme(activeThemeId);

  const selectWithArrowKeys = useArrowKeySelection(activeTheme.accents, activeAccent, setAccent);

  return (
    <SettingsSection title="Accent" note={`for ${themeDisplayName(activeTheme)}`}>
      <div className="accent-grid" role="radiogroup" aria-label="Accent colour" onKeyDown={selectWithArrowKeys}>
        {activeTheme.accents.map((accent) => (
          <button
            key={accent}
            type="button"
            role="radio"
            aria-checked={accent === activeAccent}
            aria-label={capitalize(accent)}
            title={capitalize(accent)}
            tabIndex={accent === activeAccent ? 0 : -1}
            className={cx('accent-swatch', accent === activeAccent && 'is-active')}
            data-theme={activeThemeId}
            data-accent={accent}
            onClick={() => setAccent(accent)}
          />
        ))}
      </div>
    </SettingsSection>
  );
};
