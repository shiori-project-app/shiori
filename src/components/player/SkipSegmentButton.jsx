import { memo } from 'react';
import { Icon } from '@/components/common/Icon';
import { skipButtonLabel, skippedNoticeLabel } from '@/utils/player';

const SkipSegmentButtonContent = ({ skipSegments, hasEnded }) => {
  if (hasEnded) return null;

  if (skipSegments.segment) {
    return (
      <button type="button" className="player__skip" onClick={skipSegments.skip}>
        {skipButtonLabel(skipSegments.segment.type)}
        <Icon name="next" />
      </button>
    );
  }

  if (skipSegments.skipped) {
    return (
      <span className="player__skip is-notice" role="status">
        {skippedNoticeLabel(skipSegments.skipped)}
      </span>
    );
  }

  return null;
};

export const SkipSegmentButton = memo(SkipSegmentButtonContent);
