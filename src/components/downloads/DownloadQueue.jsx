import { memo, useMemo } from 'react';
import { EmptyState } from '@/components/common/EmptyState';
import { Icon } from '@/components/common/Icon';
import { Pager } from '@/components/common/Pager';
import { useDownloads, useLiveDownloads } from '@/hooks/useDownloads';
import { usePagedList } from '@/hooks/usePagedList';
import { useVideoResolutions } from '@/hooks/useVideoResolutions';
import { cx } from '@/utils/classNames';
import { downloadPercent, downloadStatusText, queueSummary } from '@/utils/downloadStatus';
import { formatResolution } from '@/utils/format';
import { isActive, isPending, isRetryable } from '@shared/downloadStates';

const IconButton = ({ icon, label, onClick, disabled }) => (
  <button
    type="button"
    className="download__icon"
    aria-label={label}
    title={label}
    onClick={onClick}
    disabled={disabled}
  >
    <Icon name={icon} />
  </button>
);

const QueueItem = ({ download, resolutionLabel, isFirst, isLast, actions }) => {
  const isWaiting = isPending(download);

  return (
    <li className={cx('download', `is-${download.state}`)}>
      {isWaiting && (
        <div className="download__order">
          <IconButton icon="up" label="Move up" disabled={isFirst} onClick={() => actions.move(download.id, -1)} />
          <IconButton icon="down" label="Move down" disabled={isLast} onClick={() => actions.move(download.id, 1)} />
        </div>
      )}

      <div className="download__info">
        <p className="download__title">{download.label}</p>
        <p className="download__status">{downloadStatusText(download, resolutionLabel)}</p>

        <div className="download__bar">
          <span style={{ width: `${downloadPercent(download)}%` }} />
        </div>
      </div>

      {isActive(download) && <IconButton icon="pause" label="Pause" onClick={() => actions.pause(download.id)} />}

      {download.state === 'paused' && (
        <IconButton icon="play" label="Resume" onClick={() => actions.resume(download.id)} />
      )}

      {isRetryable(download) && <IconButton icon="refresh" label="Retry" onClick={() => actions.retry(download)} />}

      {download.state === 'completed' && (
        <IconButton icon="folder" label="Show in folder" onClick={() => actions.showInFolder(download)} />
      )}

      {isWaiting ? (
        <IconButton icon="close" label="Cancel" onClick={() => actions.cancel(download.id)} />
      ) : (
        <IconButton icon="close" label="Remove from list" onClick={() => actions.remove(download.id)} />
      )}
    </li>
  );
};

const DownloadQueueItem = memo(QueueItem);

const QueueActions = ({ downloads, pauseAll, resumeAll, clearFinished }) => {
  const { hasRunning, hasPaused, hasFinished } = queueSummary(downloads);

  return (
    <div className="downloads__actions">
      {hasRunning && (
        <button type="button" className="btn btn--sm" onClick={pauseAll}>
          Pause all
        </button>
      )}

      {hasPaused && (
        <button type="button" className="btn btn--sm" onClick={resumeAll}>
          Resume all
        </button>
      )}

      {hasFinished && (
        <button type="button" className="btn btn--sm" onClick={clearFinished}>
          Clear finished
        </button>
      )}
    </div>
  );
};

export const DownloadQueue = () => {
  const downloads = useLiveDownloads();

  const { pauseAll, resumeAll, clearFinished, pause, resume, cancel, retry, move, remove, showInFolder } =
    useDownloads();

  const itemActions = useMemo(
    () => ({ pause, resume, cancel, retry, move, remove, showInFolder }),
    [pause, resume, cancel, retry, move, remove, showInFolder],
  );

  const { pageItems, pageInfo, firstItemIndex, setPage } = usePagedList(downloads);

  const resolutions = useVideoResolutions(
    pageItems.filter((download) => download.state === 'completed').map((download) => download.savePath),
    'finishedDownloads',
  );

  if (!downloads.length) {
    return (
      <EmptyState title="No downloads yet">
        Use “Download” on a series or episode, or “Track” to get new episodes automatically.
      </EmptyState>
    );
  }

  return (
    <>
      <QueueActions downloads={downloads} pauseAll={pauseAll} resumeAll={resumeAll} clearFinished={clearFinished} />

      <ul className="downloads">
        {pageItems.map((download, indexOnPage) => {
          const queuePosition = firstItemIndex + indexOnPage;

          return (
            <DownloadQueueItem
              key={download.id}
              download={download}
              resolutionLabel={formatResolution(resolutions[download.savePath])}
              isFirst={queuePosition === 0}
              isLast={queuePosition === downloads.length - 1}
              actions={itemActions}
            />
          );
        })}
      </ul>

      <Pager pageInfo={pageInfo} onChange={setPage} />
    </>
  );
};
