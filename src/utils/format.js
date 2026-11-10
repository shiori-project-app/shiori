import { ANILIST_EXACT_TOTAL_LIMIT } from '@/config/api.config';

const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;
const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 1440;
const MILLISECONDS_PER_MINUTE = 60000;
const BYTES_PER_KILOBYTE = 1024;

const STANDARD_VIDEO_HEIGHTS = [2160, 1440, 1080, 900, 720, 576, 540, 480, 360, 240];
const STANDARD_HEIGHT_TOLERANCE = 0.03;
const HEIGHT_PER_WIDTH_IN_WIDESCREEN = 9 / 16;

export const twoDigits = (number) => String(number).padStart(2, '0');

const standardHeightNear = (frameHeight) =>
  STANDARD_VIDEO_HEIGHTS.find((height) => Math.abs(frameHeight - height) <= height * STANDARD_HEIGHT_TOLERANCE);

export const formatResolution = (resolution) => {
  if (!resolution) return '';

  const widescreenHeight = Math.max(resolution.height, Math.round(resolution.width * HEIGHT_PER_WIDTH_IN_WIDESCREEN));
  const standardHeight = standardHeightNear(widescreenHeight) ?? standardHeightNear(resolution.height);

  return `${standardHeight ?? widescreenHeight}p`;
};

export const formatDuration = (totalSeconds) => {
  const wholeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(wholeSeconds / SECONDS_PER_HOUR);
  const minutes = Math.floor((wholeSeconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);

  const seconds = twoDigits(wholeSeconds % SECONDS_PER_MINUTE);

  return hours ? `${hours}:${twoDigits(minutes)}:${seconds}` : `${minutes}:${seconds}`;
};

const WHOLE_HOURS_FROM = 10;

export const formatHours = (totalSeconds) => {
  const hours = Math.max(0, totalSeconds) / SECONDS_PER_HOUR;

  return hours < WHOLE_HOURS_FROM ? hours.toFixed(1) : Math.round(hours).toLocaleString();
};

export const formatCountdown = (unixSeconds, now = Date.now()) => {
  const totalMinutes = Math.max(0, Math.round((unixSeconds * 1000 - now) / MILLISECONDS_PER_MINUTE));
  const days = Math.floor(totalMinutes / MINUTES_PER_DAY);
  const hours = Math.floor((totalMinutes % MINUTES_PER_DAY) / MINUTES_PER_HOUR);

  const minutes = totalMinutes % MINUTES_PER_HOUR;

  if (days) return `${days}d ${hours}h`;

  return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
};

export const formatRating = (rating) => (rating ? rating.toFixed(1) : '–');

export const formatDateTime = (milliseconds) =>
  new Date(milliseconds).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

export const formatDate = (milliseconds) => new Date(milliseconds).toLocaleDateString([], { dateStyle: 'medium' });

export const formatBytes = (bytes) => {
  if (bytes >= BYTES_PER_KILOBYTE ** 3) return `${(bytes / BYTES_PER_KILOBYTE ** 3).toFixed(2)} GB`;
  if (bytes >= BYTES_PER_KILOBYTE ** 2) return `${(bytes / BYTES_PER_KILOBYTE ** 2).toFixed(1)} MB`;

  return `${Math.round(bytes / BYTES_PER_KILOBYTE)} KB`;
};

export const pluralize = (count, singular, plural = `${singular}s`) =>
  `${count.toLocaleString()} ${count === 1 ? singular : plural}`;

export const formatTitleCount = ({ total }) => (total >= ANILIST_EXACT_TOTAL_LIMIT ? '' : pluralize(total, 'title'));

export const capitalize = (word) => word.charAt(0).toUpperCase() + word.slice(1);

export const todayAsIsoDate = () => new Date().toISOString().slice(0, 10);
