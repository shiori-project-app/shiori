import { memo } from 'react';
import { Icon } from '@/components/common/Icon';
import { cx } from '@/utils/classNames';
import { skipButtonLabel, skippedNoticeLabel } from '@/utils/player';

const PromptTimer = ({ remaining }) => (
  <span className="player__skip-timer" style={{ transform: `scaleX(${remaining})` }} aria-hidden="true" />
);

const SkipSegmentButtonContent = ({ skipSegments, hasEnded }) => {
  if (hasEnded) return null;

  if (skipSegments.segment) {
    return (
      <button
        type="button"
        className={cx('player__skip', skipSegments.isPrompting && 'is-prompting')}
        onClick={skipSegments.skip}
      >
        {skipButtonLabel(skipSegments.segment.type)}
        <Icon name="next" />
        <PromptTimer remaining={skipSegments.promptRemaining} />
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
