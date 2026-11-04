import { useState } from 'react';
import { useDownloads } from '@/hooks/useDownloads';
import { pluralize } from '@/utils/format';

export const QUEUE_STATUS = { preparing: 'preparing', success: 'success', error: 'error' };

const queuedMessage = (addedCount, failedCount) => {
  const failedText = failedCount ? ` ${pluralize(failedCount, 'episode')} had no download link.` : '';

  if (addedCount) return `Added ${pluralize(addedCount, 'episode')} to Downloads.${failedText}`;

  return failedText || 'Already in the queue.';
};

export const useAnimeHeavenQueue = (series) => {
  const { queueEpisodes } = useDownloads();

  const [queueStatus, setQueueStatus] = useState(null);

  const queueForDownload = async (episodes) => {
    setQueueStatus({ kind: QUEUE_STATUS.preparing, message: 'Preparing…' });

    try {
      const { added, failed } = await queueEpisodes(series, episodes, (resolvedCount, totalCount) =>
        setQueueStatus({
          kind: QUEUE_STATUS.preparing,
          message: `Preparing ${Math.min(resolvedCount + 1, totalCount)} of ${totalCount}…`,
        }),
      );

      setQueueStatus({
        kind: failed ? QUEUE_STATUS.error : QUEUE_STATUS.success,
        message: queuedMessage(added, failed),
      });
    } catch (error) {
      setQueueStatus({ kind: QUEUE_STATUS.error, message: `Couldn’t add to Downloads: ${error.message}` });
    }
  };

  return { queueStatus, isPreparing: queueStatus?.kind === QUEUE_STATUS.preparing, queueForDownload };
};
