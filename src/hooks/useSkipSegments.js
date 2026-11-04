import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchSkipTimes } from '@/api/services/skipService';
import { useAsync } from '@/hooks/useAsync';
import { fitSkipTimes, reachedByPlaying, segmentAt } from '@/utils/skipTimes';

const SKIPPED_NOTICE_MS = 2500;
const NO_SKIP_TIMES = [];

const useSkippedNotice = () => {
  const [skippedSegmentType, setSkippedSegmentType] = useState(null);

  useEffect(() => {
    if (!skippedSegmentType) return;

    const hideTimer = setTimeout(() => setSkippedSegmentType(null), SKIPPED_NOTICE_MS);

    return () => clearTimeout(hideTimer);
  }, [skippedSegmentType]);

  return [skippedSegmentType, setSkippedSegmentType];
};

export const useSkipSegments = ({ malId, episode, duration, time, playing, seek, auto }) => {
  const skipTimes = useAsync(
    () => (malId ? fetchSkipTimes(malId, episode) : Promise.resolve(NO_SKIP_TIMES)),
    [malId, episode],
  ).data;

  const segments = useMemo(() => (duration ? fitSkipTimes(skipTimes, duration) : []), [skipTimes, duration]);

  const currentSegment = segmentAt(segments, time);

  const skippedSegmentTypes = useRef(new Set());
  const previousTime = useRef(null);

  const [skippedSegmentType, setSkippedSegmentType] = useSkippedNotice();

  const skipPastSegment = useCallback(
    (segment) => {
      skippedSegmentTypes.current.add(segment.type);
      seek(segment.end);
    },
    [seek],
  );

  const skipCurrentSegment = useCallback(
    () => currentSegment && skipPastSegment(currentSegment),
    [currentSegment, skipPastSegment],
  );

  useEffect(() => {
    const shouldAutoSkip =
      auto &&
      playing &&
      currentSegment &&
      !skippedSegmentTypes.current.has(currentSegment.type) &&
      reachedByPlaying(currentSegment, previousTime.current, time);

    if (!shouldAutoSkip) return;

    skipPastSegment(currentSegment);
    setSkippedSegmentType(currentSegment.type);
  }, [auto, playing, currentSegment, time, skipPastSegment, setSkippedSegmentType]);

  useEffect(() => {
    previousTime.current = time;
  }, [time]);

  return useMemo(
    () => ({ segments, segment: currentSegment, skip: skipCurrentSegment, skipped: skippedSegmentType }),
    [segments, currentSegment, skipCurrentSegment, skippedSegmentType],
  );
};
