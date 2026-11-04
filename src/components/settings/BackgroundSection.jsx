import { Switch } from '@/components/common/Switch';
import { SettingsList, SettingsRow, SettingsSection } from '@/components/settings/SettingsSection';
import { useSettings } from '@/hooks/useSettings';

const startAtLoginTitle = (platform) => (platform === 'linux' ? 'Start when you sign in' : 'Start with Windows');

const startAtLoginText = (canStartAtLogin, opensInTray) => {
  if (!canStartAtLogin) return 'Only available in the installed app.';

  return opensInTray
    ? 'Opens in the tray when you sign in, with no window, so tracking starts on its own.'
    : 'Opens Shiori when you sign in.';
};

const trayText = (canKeepRunningInTray) =>
  canKeepRunningInTray
    ? 'Closing the window leaves Shiori in the system tray, so tracked shows keep checking and downloads keep going. Quit from the tray icon’s menu.'
    : 'Your desktop has no tray area, so closing the window quits Shiori. On GNOME, the AppIndicator extension adds one; restart Shiori after installing it.';

export const BackgroundSection = () => {
  const { platform, keepRunningInTray, canKeepRunningInTray, startAtLogin, canStartAtLogin, updateBackground } =
    useSettings();

  const staysInTray = keepRunningInTray && canKeepRunningInTray;
  const startTitle = startAtLoginTitle(platform);

  return (
    <SettingsSection title="Running in the background">
      <SettingsList>
        <SettingsRow title="Keep running in the tray" description={trayText(canKeepRunningInTray)}>
          <Switch
            label="Keep running in the tray"
            checked={staysInTray}
            disabled={!canKeepRunningInTray}
            onChange={() => updateBackground({ keepRunningInTray: !keepRunningInTray })}
          />
        </SettingsRow>

        <SettingsRow title={startTitle} description={startAtLoginText(canStartAtLogin, staysInTray)}>
          <Switch
            label={startTitle}
            checked={startAtLogin}
            disabled={!canStartAtLogin}
            onChange={() => updateBackground({ startAtLogin: !startAtLogin })}
          />
        </SettingsRow>
      </SettingsList>
    </SettingsSection>
  );
};
