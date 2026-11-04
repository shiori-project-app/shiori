import { formatDuration } from '@/utils/format';
import { languageName } from '@/utils/languages';

const RESUME_MIN_SECONDS = 5;
const RESUME_END_MARGIN_SECONDS = 30;
const PERCENT = 100;

const SEGMENT_MARK_COLORS = {
  intro: 'rgb(250 204 21 / 0.9)',
  ending: 'rgb(250 204 21 / 0.9)',
  recap: 'rgb(148 163 184 / 0.9)',
};

const NO_SEGMENT_MARKS = 'none';

const SEGMENT_NAMES = { intro: 'Intro', ending: 'Ending', recap: 'Recap' };

export const skipButtonLabel = (segmentType) => `Skip ${SEGMENT_NAMES[segmentType].toLowerCase()}`;

export const skippedNoticeLabel = (segmentType) => `Skipped ${SEGMENT_NAMES[segmentType].toLowerCase()}`;

export const resumablePosition = (time, duration) => {
  const isResumable = time > RESUME_MIN_SECONDS && duration && time < duration - RESUME_END_MARGIN_SECONDS;

  return isResumable ? Math.floor(time) : null;
};

export const playedPercent = (time, duration) => (duration ? Math.min(PERCENT, (time / duration) * PERCENT) : 0);

export const trackLabel = (track, index) => track.name || languageName(track.language) || `Track ${index + 1}`;

export const isPlayerControlTarget = (event) =>
  event.target.closest(
    '.player__controls, .player__endcard, .player__menu, .player__error, .player__skip, .player__pip-return',
  );

const segmentColorStops = (segment, duration) => {
  const startPercent = playedPercent(segment.start, duration);
  const endPercent = playedPercent(segment.end, duration);

  const color = SEGMENT_MARK_COLORS[segment.type];

  return [
    `transparent ${startPercent}%`,
    `${color} ${startPercent}%`,
    `${color} ${endPercent}%`,
    `transparent ${endPercent}%`,
  ];
};

export const segmentMarksGradient = (segments, duration) =>
  segments.length && duration
    ? `linear-gradient(to right, ${segments.flatMap((segment) => segmentColorStops(segment, duration)).join(', ')})`
    : NO_SEGMENT_MARKS;

export const describeSegments = (segments) =>
  segments
    .map(
      (segment) => `${SEGMENT_NAMES[segment.type]} ${formatDuration(segment.start)} to ${formatDuration(segment.end)}`,
    )
    .join(', ');
