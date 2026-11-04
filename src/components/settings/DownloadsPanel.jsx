import { SegmentedControl } from '@/components/common/SegmentedControl';
import { Select } from '@/components/common/Select';
import { DownloadFolderBar } from '@/components/downloads/DownloadFolderBar';
import { BackgroundSection } from '@/components/settings/BackgroundSection';
import { SettingsList, SettingsRow, SettingsSection } from '@/components/settings/SettingsSection';
import { useSettings } from '@/hooks/useSettings';
import { PARALLEL_DOWNLOAD_OPTIONS, SPEED_LIMIT_OPTIONS_KBPS, speedLimitLabel } from '@shared/downloadLimits';

const PARALLEL_DOWNLOAD_CHOICES = PARALLEL_DOWNLOAD_OPTIONS.map((count) => ({ id: count, label: count }));

const SPEED_LIMIT_CHOICES = SPEED_LIMIT_OPTIONS_KBPS.map((kilobytesPerSecond) => [
  kilobytesPerSecond,
  speedLimitLabel(kilobytesPerSecond),
]);

const DownloadLimits = () => {
  const { maxParallelDownloads, speedLimitKBps, updateDownloads } = useSettings();

  return (
    <SettingsList>
      <SettingsRow
        title="Downloads at once"
        description="How many episodes download at the same time. Lowering it puts the extra ones back in the queue; they continue from where they stopped."
      >
        <SegmentedControl
          label="Downloads at once"
          options={PARALLEL_DOWNLOAD_CHOICES}
          value={maxParallelDownloads}
          onChange={(count) => updateDownloads({ maxParallelDownloads: count })}
        />
      </SettingsRow>

      <SettingsRow
        title="Speed limit"
        description="Shared by all of Shiori’s downloads. Torrents use qBittorrent’s own limits."
      >
        <Select
          srLabel="Speed limit"
          value={speedLimitKBps}
          onChange={(kilobytesPerSecond) => updateDownloads({ speedLimitKBps: kilobytesPerSecond })}
          options={SPEED_LIMIT_CHOICES}
        />
      </SettingsRow>
    </SettingsList>
  );
};

export const DownloadsPanel = () => (
  <>
    <SettingsSection title="Downloads">
      <DownloadFolderBar />

      <p className="settings-section__hint">
        Direct downloads, torrents sent to qBittorrent and the library scan all use this folder.
      </p>

      <DownloadLimits />
    </SettingsSection>

    <BackgroundSection />
  </>
);
