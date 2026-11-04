import { RestoreBackupDialog } from '@/components/settings/RestoreBackupDialog';
import { SettingsList, SettingsRow, SettingsSection } from '@/components/settings/SettingsSection';
import { BACKUP_ACTIONS, useBackupActions } from '@/hooks/useBackupActions';
import { pluralize } from '@/utils/format';

export const BackupPanel = () => {
  const {
    listSize,
    runningAction,
    errorMessage,
    backupAwaitingConfirmation,
    exportBackup,
    chooseBackupFile,
    confirmRestore,
    cancelRestore,
    exportListForMal,
  } = useBackupActions();

  const isBusy = runningAction !== null;

  const isRunning = (actionName) => runningAction === actionName;

  return (
    <SettingsSection title="Backup">
      <SettingsList>
        <SettingsRow
          title="Back up Shiori"
          description="Saves My List, watched episodes, history, notes, tracked shows and your appearance, display and playback settings to one file. The download folder and download limits stay as they are on this PC."
        >
          <button type="button" className="btn btn--sm" disabled={isBusy} onClick={exportBackup}>
            {isRunning(BACKUP_ACTIONS.backup) ? 'Saving…' : 'Export backup'}
          </button>
        </SettingsRow>

        <SettingsRow
          title="Restore a backup"
          description="Replaces what’s in Shiori now with a backup file. Your current data is saved to Shiori’s backups folder first."
        >
          <button type="button" className="btn btn--sm" disabled={isBusy} onClick={chooseBackupFile}>
            {isRunning(BACKUP_ACTIONS.restore) ? 'Opening…' : 'Restore…'}
          </button>
        </SettingsRow>

        <SettingsRow
          title="Export for MyAnimeList / AniList"
          description={`My List (${pluralize(listSize, 'title')}) as a MyAnimeList XML file, which both sites can import.`}
        >
          <button type="button" className="btn btn--sm" disabled={isBusy || !listSize} onClick={exportListForMal}>
            {isRunning(BACKUP_ACTIONS.listExport) ? 'Exporting…' : 'Export list'}
          </button>
        </SettingsRow>
      </SettingsList>

      {errorMessage && !backupAwaitingConfirmation && <p className="settings-section__hint is-error">{errorMessage}</p>}

      {backupAwaitingConfirmation && (
        <RestoreBackupDialog
          backup={backupAwaitingConfirmation}
          isRestoring={isRunning(BACKUP_ACTIONS.restore)}
          errorMessage={errorMessage}
          onConfirm={confirmRestore}
          onCancel={cancelRestore}
        />
      )}
    </SettingsSection>
  );
};
