import { tabElementId, Tabs } from '@/components/common/Tabs';
import { AppearancePanel } from '@/components/settings/AppearancePanel';
import { BackupPanel } from '@/components/settings/BackupPanel';
import { DisplayPanel } from '@/components/settings/DisplayPanel';
import { DownloadsPanel } from '@/components/settings/DownloadsPanel';
import { PlaybackPanel } from '@/components/settings/PlaybackPanel';
import { StoragePanel } from '@/components/settings/StoragePanel';
import { UpdatesPanel } from '@/components/settings/UpdatesPanel';
import { DEFAULT_SETTINGS_TAB, SETTINGS_TABS } from '@/constants/settingsTabs';
import { useSearchParam } from '@/hooks/useSearchParam';

const SETTINGS_PANEL_ID = 'settings-panel';

const PANELS_BY_TAB = {
  appearance: AppearancePanel,
  display: DisplayPanel,
  playback: PlaybackPanel,
  downloads: DownloadsPanel,
  backup: BackupPanel,
  storage: StoragePanel,
  updates: UpdatesPanel,
};

export const SettingsPage = () => {
  const [requestedTab, setActiveTab] = useSearchParam('tab', DEFAULT_SETTINGS_TAB, { replace: true });

  const activeTab = requestedTab in PANELS_BY_TAB ? requestedTab : DEFAULT_SETTINGS_TAB;
  const ActivePanel = PANELS_BY_TAB[activeTab];

  return (
    <>
      <h1 className="page-title">Settings</h1>

      <Tabs
        tabs={SETTINGS_TABS}
        value={activeTab}
        onChange={setActiveTab}
        label="Settings sections"
        panelId={SETTINGS_PANEL_ID}
      />

      <div
        id={SETTINGS_PANEL_ID}
        className="settings-panel"
        role="tabpanel"
        aria-labelledby={tabElementId(SETTINGS_PANEL_ID, activeTab)}
      >
        <ActivePanel />
      </div>
    </>
  );
};
