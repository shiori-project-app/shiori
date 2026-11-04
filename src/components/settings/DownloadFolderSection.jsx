import { useState } from 'react';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import { Select } from '@/components/common/Select';
import { SettingsList, SettingsRow, SettingsSection } from '@/components/settings/SettingsSection';
import { WatchedCleanupDialog } from '@/components/settings/WatchedCleanupDialog';
import { cleanupActionOptions, CLEANUP_ACTIONS, CLEANUP_AFTER_DAYS_OPTIONS } from '@/constants/preferences';
import { usePreferences } from '@/hooks/usePreferences';
import { useSettings } from '@/hooks/useSettings';
import { CLEANUP_PHASES, useWatchedCleanup } from '@/hooks/useWatchedCleanup';
import { formatBytes, pluralize } from '@/utils/format';
import { trashNameOn } from '@shared/platformNames';

const AFTER_DAYS_CHOICES = CLEANUP_AFTER_DAYS_OPTIONS.map((days) => [days, `${days} days`]);

const diskSpaceText = ({ freeBytes, totalBytes }) =>
  freeBytes == null ? '' : ` ${formatBytes(freeBytes)} free of ${formatBytes(totalBytes)} on this drive.`;

const usageText = (usage) =>
  usage
    ? `${usage.root}: ${formatBytes(usage.bytes)} in ${pluralize(usage.files, 'file')}.${diskSpaceText(usage)}`
    : 'Measuring…';

export const DownloadFolderSection = () => {
  const { cleanupAfterDays, cleanupAction, setPreference } = usePreferences();
  const { platform, cleanupMoveFolder, chooseCleanupMoveFolder } = useSettings();
  const cleanup = useWatchedCleanup();

  const trashName = trashNameOn(platform);

  const [moveFolderError, setMoveFolderError] = useState(null);

  const chooseMoveFolder = async () => {
    setMoveFolderError(null);

    try {
      await chooseCleanupMoveFolder();
    } catch (error) {
      setMoveFolderError(error.message);
    }
  };

  const shownError = moveFolderError ?? cleanup.errorMessage;
  const isMoving = cleanupAction === CLEANUP_ACTIONS.move;

  const isFinding = cleanup.phase === CLEANUP_PHASES.finding;
  const isReviewOpen = cleanup.review !== null && cleanup.phase !== CLEANUP_PHASES.idle;

  return (
    <SettingsSection title="Download folder">
      <SettingsList>
        <SettingsRow title="Disk usage" description={usageText(cleanup.usage)} />

        <SettingsRow
          title="Watched at least"
          description="How long ago you must have watched an episode before it can be cleaned up. Episodes imported from other sites have no watch date, so they’re left alone."
        >
          <Select
            srLabel="Watched at least"
            value={cleanupAfterDays}
            onChange={(days) => setPreference('cleanupAfterDays', days)}
            options={AFTER_DAYS_CHOICES}
          />
        </SettingsRow>

        <SettingsRow
          title="What happens to them"
          description={`The ${trashName} lets you restore anything you change your mind about. Moving keeps them on another drive or folder.`}
        >
          <SegmentedControl
            label="What happens to them"
            options={cleanupActionOptions(trashName)}
            value={cleanupAction}
            onChange={(action) => setPreference('cleanupAction', action)}
          />
        </SettingsRow>

        {isMoving && (
          <SettingsRow title="Move them to" description={cleanupMoveFolder ?? 'No folder chosen yet.'}>
            <button type="button" className="btn btn--sm" onClick={chooseMoveFolder}>
              Choose folder
            </button>
          </SettingsRow>
        )}

        <SettingsRow
          title="Clean up watched episodes"
          description="Lists the exact files first. Nothing changes until you confirm, and Shiori never does this on its own."
        >
          <button
            type="button"
            className="btn btn--sm"
            disabled={isFinding || (isMoving && !cleanupMoveFolder)}
            onClick={cleanup.findEpisodes}
          >
            {isFinding ? 'Looking…' : 'Review episodes'}
          </button>
        </SettingsRow>
      </SettingsList>

      {shownError && <p className="settings-section__hint is-error">{shownError}</p>}

      {isReviewOpen && (
        <WatchedCleanupDialog
          review={cleanup.review}
          selectedPaths={cleanup.selectedPaths}
          phase={cleanup.phase}
          cleanedCount={cleanup.cleanedCount}
          outcome={cleanup.outcome}
          action={cleanupAction}
          moveFolder={cleanupMoveFolder}
          trashName={trashName}
          afterDays={cleanupAfterDays}
          onToggle={cleanup.toggleCandidate}
          onConfirm={cleanup.confirmCleanup}
          onClose={cleanup.closeReview}
        />
      )}
    </SettingsSection>
  );
};
