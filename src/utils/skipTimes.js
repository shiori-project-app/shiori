import { SKIP_PROMPT_SECONDS } from '@/config/app.config';

export const SKIP_TYPES = { op: 'intro', 'mixed-op': 'intro', ed: 'ending', 'mixed-ed': 'ending', recap: 'recap' };

const MAX_LENGTH_DIFFERENCE_SECONDS = 30;
const MIN_SEGMENT_SECONDS = 5;
const MAX_PLAYBACK_STEP_SECONDS = 2;
const SEEK_BACK_THRESHOLD_SECONDS = 1;
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

export const segmentShownUntil = (segment) => segment.end - SEGMENT_END_MARGIN_SECONDS;

export const segmentAt = (segments, time) =>
  segments.find((segment) => time >= segment.start && time < segmentShownUntil(segment)) ?? null;

export const seekedBack = (previousTime, time) =>
  previousTime != null && time < previousTime - SEEK_BACK_THRESHOLD_SECONDS;

export const NO_SKIP_PROMPT = { segmentKey: null, startedAt: 0 };

const NOT_PROMPTING = { isPrompting: false, promptRemaining: 0 };

export const skipSegmentKey = (segment) => (segment ? `${segment.type}-${segment.start}` : null);

export const nextSkipPrompt = (currentPrompt, segmentKey, previousTime, time) => {
  if (segmentKey === null) return NO_SKIP_PROMPT;

  const startsPrompt = segmentKey !== currentPrompt.segmentKey || seekedBack(previousTime, time);

  return startsPrompt ? { segmentKey, startedAt: time } : currentPrompt;
};

export const skipPromptProgress = (segment, prompt, time) => {
  const segmentKey = skipSegmentKey(segment);

  if (segmentKey === null) return NOT_PROMPTING;

  const startedAt = segmentKey === prompt.segmentKey ? prompt.startedAt : time;
  const promptSeconds = Math.min(SKIP_PROMPT_SECONDS, segmentShownUntil(segment) - startedAt);
  const secondsLeft = promptSeconds - Math.max(0, time - startedAt);

  const isPrompting = secondsLeft > 0;

  return { isPrompting, promptRemaining: isPrompting ? secondsLeft / promptSeconds : 0 };
};

export const reachedByPlaying = (segment, previousTime, time) =>
  previousTime != null &&
  previousTime <= segment.start + SEGMENT_START_TOLERANCE_SECONDS &&
  time >= previousTime &&
  time - previousTime <= MAX_PLAYBACK_STEP_SECONDS;
