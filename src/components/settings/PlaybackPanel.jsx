import { Switch } from '@/components/common/Switch';
import { SettingsList, SettingsRow, SettingsSection } from '@/components/settings/SettingsSection';
import { useTogglePreference } from '@/hooks/usePreferences';

export const PlaybackPanel = () => {
  const [autoSkip, toggleAutoSkip] = useTogglePreference('autoSkip');

  return (
    <SettingsSection title="Playback">
      <SettingsList>
        <SettingsRow
          title="Skip intros and endings automatically"
          description="Uses AniSkip’s community timestamps. When off, a “Skip intro” button shows instead (or press S)."
        >
          <Switch label="Skip intros and endings automatically" checked={autoSkip} onChange={toggleAutoSkip} />
        </SettingsRow>
      </SettingsList>
    </SettingsSection>
  );
};
