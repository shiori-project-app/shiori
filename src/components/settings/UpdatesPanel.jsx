import { checkForUpdates, downloadUpdate, installUpdate } from '@/api/clients/desktopClient';
import { Switch } from '@/components/common/Switch';
import { SettingsList, SettingsRow, SettingsSection } from '@/components/settings/SettingsSection';
import { useAppUpdate } from '@/hooks/useAppUpdate';
import { useSettings } from '@/hooks/useSettings';
import { updateStatusText } from '@/utils/updateStatus';
import { UPDATE_PHASES } from '@shared/updatePhases';

const AUTO_UPDATE_TITLE = 'Download updates automatically';

const AUTO_UPDATE_DESCRIPTION =
  'Shiori always checks GitHub when it opens. With this on, it also checks every 6 hours and downloads new versions in the background. With it off, it tells you about a new version and waits for you to download it.';

const ACTION_BY_PHASE = {
  [UPDATE_PHASES.idle]: { label: 'Check for updates', run: checkForUpdates },
  [UPDATE_PHASES.upToDate]: { label: 'Check for updates', run: checkForUpdates },
  [UPDATE_PHASES.failed]: { label: 'Try again', run: checkForUpdates },
  [UPDATE_PHASES.available]: { label: 'Download', run: downloadUpdate, isPrimary: true },
  [UPDATE_PHASES.ready]: { label: 'Restart to update', run: installUpdate, isPrimary: true },
};

const UpdateAction = ({ phase }) => {
  const action = ACTION_BY_PHASE[phase];

  if (!action) return null;

  return (
    <button type="button" className={`btn btn--sm${action.isPrimary ? ' btn--primary' : ''}`} onClick={action.run}>
      {action.label}
    </button>
  );
};

export const UpdatesPanel = () => {
  const { autoUpdate, updateAutoUpdate } = useSettings();
  const update = useAppUpdate();

  if (!update) return null;

  const isUnsupported = update.phase === UPDATE_PHASES.unsupported;
  const versionTitle = update.currentVersion ? `Shiori ${update.currentVersion}` : 'Shiori';

  return (
    <SettingsSection title="Updates">
      <SettingsList>
        <SettingsRow title={versionTitle} description={updateStatusText(update)}>
          <UpdateAction phase={update.phase} />
        </SettingsRow>

        <SettingsRow title={AUTO_UPDATE_TITLE} description={AUTO_UPDATE_DESCRIPTION}>
          <Switch
            label={AUTO_UPDATE_TITLE}
            checked={autoUpdate && !isUnsupported}
            disabled={isUnsupported}
            onChange={() => updateAutoUpdate({ autoUpdate: !autoUpdate })}
          />
        </SettingsRow>
      </SettingsList>
    </SettingsSection>
  );
};
