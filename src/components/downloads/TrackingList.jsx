import { memo, useCallback, useState } from 'react';
import { Link } from 'react-router';
import { getCachedSeries, loadSeries } from '@/api/services/seriesRegistry';
import { EmptyState } from '@/components/common/EmptyState';
import { Icon } from '@/components/common/Icon';
import { Pager } from '@/components/common/Pager';
import { TrackDialog } from '@/components/downloads/TrackDialog';
import { seriesPath } from '@/constants/routes';
import { RESOLUTION_OPTIONS } from '@/constants/torrents';
import { useAsync } from '@/hooks/useAsync';
import { usePagedList } from '@/hooks/usePagedList';
import { useTracking } from '@/hooks/useTracking';
import { formatDateTime } from '@/utils/format';

const resolutionLabel = (resolution) => RESOLUTION_OPTIONS.find(([value]) => value === resolution)?.[1] ?? resolution;

const trackingSourceText = (entry) => {
  if (entry.source === 'animeheaven') return 'AnimeHeaven · 1080p subbed';
  if (entry.source === 'subsplease') return `SubsPlease · ${entry.resolution}p`;

  return `Nyaa · ${resolutionLabel(entry.resolution)} · ${entry.audio === 'dub' ? 'English dub' : 'any audio'}`;
};

const lastCheckText = (entry) =>
  entry.lastCheckedAt ? `${formatDateTime(entry.lastCheckedAt)}: ${entry.lastResult}` : 'Not checked yet';

const TrackedShow = memo(({ seriesId, entry, isChecking, canEdit, onCheck, onEdit, onStop }) => (
  <li className="download">
    <div className="download__info">
      <p className="download__title">
        <Link to={seriesPath(seriesId)}>{entry.title}</Link>
      </p>

      <p className="download__status">
        {trackingSourceText(entry)} · from EP {entry.fromEpisode}
      </p>

      <p className="download__status">{lastCheckText(entry)}</p>
    </div>

    <button type="button" className="btn btn--sm" disabled={isChecking} onClick={() => onCheck(seriesId)}>
      Check now
    </button>

    <button type="button" className="btn btn--sm" disabled={!canEdit} onClick={() => onEdit(seriesId)}>
      Edit
    </button>

    <button type="button" className="btn btn--sm" onClick={() => onStop(seriesId)}>
      Stop
    </button>
  </li>
));

export const TrackingList = () => {
  const { tracked, checking, nextCheckAt, checkNow, untrack } = useTracking();

  const [editingSeriesId, setEditingSeriesId] = useState(null);

  const trackedSeriesIds = Object.keys(tracked).map(Number);

  const { pageItems: seriesIdsOnPage, pageInfo, setPage } = usePagedList(trackedSeriesIds);
  const seriesDetails = useAsync(() => loadSeries(seriesIdsOnPage), seriesIdsOnPage);

  const stopEditing = useCallback(() => setEditingSeriesId(null), []);

  if (!trackedSeriesIds.length) {
    return (
      <EmptyState title="Not tracking anything">
        Open a series and press “Track” to download its new episodes automatically while Shiori is open.
      </EmptyState>
    );
  }

  const editingSeries = editingSeriesId && getCachedSeries(editingSeriesId);

  return (
    <>
      <div className="downloads__actions">
        <button type="button" className="btn btn--sm" disabled={checking} onClick={() => checkNow()}>
          <Icon name="refresh" />
          {checking ? 'Checking…' : 'Check all now'}
        </button>

        {nextCheckAt && !checking && <span className="downloads__note">Next check {formatDateTime(nextCheckAt)}</span>}
      </div>

      <ul className="downloads">
        {seriesIdsOnPage.map((seriesId) => (
          <TrackedShow
            key={seriesId}
            seriesId={seriesId}
            entry={tracked[seriesId]}
            isChecking={checking}
            canEdit={!seriesDetails.loading}
            onCheck={checkNow}
            onEdit={setEditingSeriesId}
            onStop={untrack}
          />
        ))}
      </ul>

      <Pager pageInfo={pageInfo} onChange={setPage} />
      {editingSeries && <TrackDialog series={editingSeries} onClose={stopEditing} />}
    </>
  );
};
