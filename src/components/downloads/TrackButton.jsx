import { Icon } from '@/components/common/Icon';
import { TrackDialog } from '@/components/downloads/TrackDialog';
import { useOpenState } from '@/hooks/useOpenState';
import { useTracking } from '@/hooks/useTracking';
import { cx } from '@/utils/classNames';

export const TrackButton = ({ series, className = 'btn btn--ghost' }) => {
  const { tracked } = useTracking();
  const [isDialogOpen, openDialog, closeDialog] = useOpenState();

  const isTracked = Boolean(tracked[series.id]);

  return (
    <>
      <button type="button" className={cx(className, isTracked && 'is-on')} onClick={openDialog}>
        <Icon name="bell" />
        <span>{isTracked ? 'Tracking' : 'Track'}</span>
      </button>

      {isDialogOpen && <TrackDialog series={series} onClose={closeDialog} />}
    </>
  );
};
