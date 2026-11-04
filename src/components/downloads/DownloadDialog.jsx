import { Activity, memo, useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { Tabs } from '@/components/common/Tabs';
import { AnimeHeavenPanel } from '@/components/downloads/AnimeHeavenPanel';
import { NyaaPanel } from '@/components/downloads/NyaaPanel';
import { SubsPleasePanel } from '@/components/downloads/SubsPleasePanel';
import { useDisplayTitle } from '@/hooks/usePreferences';

const DOWNLOAD_SOURCES = [
  { id: 'animeheaven', label: 'AnimeHeaven', hint: 'Direct download', Panel: AnimeHeavenPanel },
  { id: 'subsplease', label: 'SubsPlease', hint: 'Torrent', Panel: SubsPleasePanel },
  { id: 'nyaa', label: 'Nyaa', hint: 'Torrent', Panel: NyaaPanel },
];

const DownloadSourceDialog = ({ series, episode, onClose }) => {
  const [sourceId, setSourceId] = useState(DOWNLOAD_SOURCES[0].id);

  const displayTitle = useDisplayTitle();

  return (
    <Modal
      title={episode ? `Download Episode ${episode}` : 'Download season'}
      subtitle={displayTitle(series)}
      onClose={onClose}
    >
      <Tabs tabs={DOWNLOAD_SOURCES} value={sourceId} onChange={setSourceId} label="Download source" />

      {DOWNLOAD_SOURCES.map(({ id, Panel }) => (
        <Activity key={id} mode={id === sourceId ? 'visible' : 'hidden'}>
          <Panel series={series} episode={episode} />
        </Activity>
      ))}
    </Modal>
  );
};

export const DownloadDialog = memo(DownloadSourceDialog);
