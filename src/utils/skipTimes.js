export const SKIP_TYPES = { op: 'intro', 'mixed-op': 'intro', ed: 'ending', 'mixed-ed': 'ending', recap: 'recap' };

const MAX_LENGTH_DIFFERENCE_SECONDS = 30;
const MIN_SEGMENT_SECONDS = 5;
const MAX_PLAYBACK_STEP_SECONDS = 2;
const SEGMENT_END_MARGIN_SECONDS = 0.5;
const SEGMENT_START_TOLERANCE_SECONDS = 1;
const UNKNOWN_LENGTH_RANK = MAX_LENGTH_DIFFERENCE_SECONDS + 1;

const fitSubmission = (submission, duration) => {
  const type = SKIP_TYPES[submission.skipType];

  if (!type) return null;

  const hasKnownLength = submission.episodeLength > 0;
  const lengthDifference = hasKnownLength ? duration - submission.episodeLength : 0;

  if (Math.abs(lengthDifference) > MAX_LENGTH_DIFFERENCE_SECONDS) return null;

  const shift = type === 'ending' ? lengthDifference : 0;
  const start = Math.max(0, submission.interval.startTime + shift);
  const end = Math.min(duration, submission.interval.endTime + shift);

  if (end - start < MIN_SEGMENT_SECONDS) return null;

  return { type, start, end, rank: hasKnownLength ? Math.abs(lengthDifference) : UNKNOWN_LENGTH_RANK };
};

export const fitSkipTimes = (submissions, duration) => {
  const bestSegmentByType = (submissions ?? [])
    .map((submission) => fitSubmission(submission, duration))
    .filter(Boolean)
    .reduce((bestByType, segment) => {
      const currentBest = bestByType.get(segment.type);

      return !currentBest || segment.rank < currentBest.rank ? bestByType.set(segment.type, segment) : bestByType;
    }, new Map());

  return [...bestSegmentByType.values()]
    .sort((first, second) => first.start - second.start)
    .map(({ type, start, end }) => ({ type, start, end }));
};

export const segmentAt = (segments, time) =>
  segments.find((segment) => time >= segment.start && time < segment.end - SEGMENT_END_MARGIN_SECONDS) ?? null;

export const reachedByPlaying = (segment, previousTime, time) =>
  previousTime != null &&
  previousTime <= segment.start + SEGMENT_START_TOLERANCE_SECONDS &&
  time >= previousTime &&
  time - previousTime <= MAX_PLAYBACK_STEP_SECONDS;
