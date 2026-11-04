import { SegmentedControl } from '@/components/common/SegmentedControl';
import { Switch } from '@/components/common/Switch';
import { SettingsList, SettingsRow, SettingsSection } from '@/components/settings/SettingsSection';
import { SmoothGraphicsRow } from '@/components/settings/SmoothGraphicsRow';
import { TITLE_LANGUAGES } from '@/constants/preferences';
import { usePreferences, useSystemReducesMotion, useTogglePreference } from '@/hooks/usePreferences';
import { displayTitle } from '@/utils/titles';

const TITLE_LANGUAGE_EXAMPLE = {
  title: 'Frieren: Beyond Journey’s End',
  englishTitle: 'Frieren: Beyond Journey’s End',
  romajiTitle: 'Sousou no Frieren',
  nativeTitle: '葬送のフリーレン',
};

export const DisplayPanel = () => {
  const { titleLanguage, setPreference } = usePreferences();
  const [hideEcchi, toggleHideEcchi] = useTogglePreference('hideEcchi');
  const [hideSpoilers, toggleHideSpoilers] = useTogglePreference('hideSpoilers');
  const [reduceMotion, toggleReduceMotion] = useTogglePreference('reduceMotion');
  const systemReducesMotion = useSystemReducesMotion();

  return (
    <SettingsSection title="Display">
      <SettingsList>
        <SettingsRow
          title="Title language"
          description={`Shown everywhere: ${displayTitle(TITLE_LANGUAGE_EXAMPLE, titleLanguage)}. Titles without one fall back to romaji.`}
        >
          <SegmentedControl
            label="Title language"
            options={TITLE_LANGUAGES}
            value={titleLanguage}
            onChange={(languageId) => setPreference('titleLanguage', languageId)}
          />
        </SettingsRow>

        <SettingsRow
          title="Hide ecchi titles"
          description="Leaves them out of Home, Browse, search, Seasonal and the schedule."
        >
          <Switch label="Hide ecchi titles" checked={hideEcchi} onChange={toggleHideEcchi} />
        </SettingsRow>

        <SettingsRow
          title="Hide spoilers"
          description="Blurs the thumbnails and names of episodes you haven’t watched yet. Hover over one to see it."
        >
          <Switch label="Hide spoilers" checked={hideSpoilers} onChange={toggleHideSpoilers} />
        </SettingsRow>

        <SettingsRow
          title="Reduce motion"
          description={
            systemReducesMotion
              ? 'On because animation effects are off in your system settings. Turn them back on there to change this.'
              : 'Turns off animations and stops the Home banner changing on its own.'
          }
        >
          <Switch
            label="Reduce motion"
            checked={reduceMotion || systemReducesMotion}
            disabled={systemReducesMotion}
            onChange={toggleReduceMotion}
          />
        </SettingsRow>

        <SmoothGraphicsRow />
      </SettingsList>
    </SettingsSection>
  );
};
