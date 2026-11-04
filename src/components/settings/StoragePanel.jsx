import { DownloadFolderSection } from '@/components/settings/DownloadFolderSection';
import { SettingsList, SettingsRow, SettingsSection } from '@/components/settings/SettingsSection';
import { CACHES, useCacheActions } from '@/hooks/useCacheActions';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { formatBytes, pluralize } from '@/utils/format';

const subtitleUsageText = (usage) =>
  usage ? `${formatBytes(usage.subtitles.bytes)} · ${pluralize(usage.subtitles.files, 'file')}` : 'Measuring…';

const aniListUsageText = (usage) =>
  usage ? `${formatBytes(usage.anilist.bytes)} · ${pluralize(usage.anilist.shows, 'show')} saved` : 'Measuring…';

const ClearButton = ({ cacheName, isEmpty, isDisabled, clearingCache, onClear }) => (
  <button
    type="button"
    className="btn btn--sm"
    disabled={isEmpty || isDisabled || clearingCache !== null}
    onClick={() => onClear(cacheName)}
  >
    {clearingCache === cacheName ? 'Clearing…' : 'Clear'}
  </button>
);

const CachesSection = () => {
  const { usage, clearingCache, clearCache } = useCacheActions();
  const isOnline = useOnlineStatus();

  return (
    <SettingsSection
      title="Storage"
      hint="Caches only speed things up. Clearing them never touches My List, history, notes or your downloads."
    >
      <SettingsList>
        <SettingsRow
          title="Subtitle cache"
          description={`Subtitles pulled out of MKV files so they load instantly next time; they’re read again when needed. ${subtitleUsageText(usage)}`}
        >
          <ClearButton
            cacheName={CACHES.subtitles}
            isEmpty={usage?.subtitles.bytes === 0}
            clearingCache={clearingCache}
            onClear={clearCache}
          />
        </SettingsRow>

        <SettingsRow
          title="Saved AniList data"
          description={`Show details, recent lists, covers, episode names and skip times, saved to load faster and work offline, plus cached images. Shiori saves your shows again in the background. ${isOnline ? aniListUsageText(usage) : 'Reconnect first: offline, Shiori couldn’t save them again.'}`}
        >
          <ClearButton
            cacheName={CACHES.anilist}
            isEmpty={usage?.anilist.bytes === 0}
            isDisabled={!isOnline}
            clearingCache={clearingCache}
            onClear={clearCache}
          />
        </SettingsRow>
      </SettingsList>
    </SettingsSection>
  );
};

export const StoragePanel = () => (
  <>
    <DownloadFolderSection />
    <CachesSection />
  </>
);
