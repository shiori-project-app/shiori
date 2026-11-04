import { Tabs } from '@/components/common/Tabs';
import { DownloadFolderBar } from '@/components/downloads/DownloadFolderBar';
import { DownloadQueue } from '@/components/downloads/DownloadQueue';
import { TrackingList } from '@/components/downloads/TrackingList';
import { useDownloads } from '@/hooks/useDownloads';
import { useSearchParam } from '@/hooks/useSearchParam';
import { useTracking } from '@/hooks/useTracking';
import { isPending } from '@shared/downloadStates';

const QUEUE_TAB = 'queue';
const TRACKING_TAB = 'tracking';
const PAGE_RESET_PARAMS = ['page'];

export const DownloadsPage = () => {
  const { downloads } = useDownloads();
  const { tracked } = useTracking();
  const [activeTab, setActiveTab] = useSearchParam('tab', QUEUE_TAB, { resetParams: PAGE_RESET_PARAMS });

  const tabs = [
    { id: QUEUE_TAB, label: 'Queue', hint: downloads.filter(isPending).length },
    { id: TRACKING_TAB, label: 'Tracking', hint: Object.keys(tracked).length },
  ];

  return (
    <>
      <h1 className="page-title">Downloads</h1>
      <DownloadFolderBar />
      <Tabs tabs={tabs} value={activeTab} onChange={setActiveTab} label="Downloads" />
      {activeTab === QUEUE_TAB ? <DownloadQueue /> : <TrackingList />}
    </>
  );
};
