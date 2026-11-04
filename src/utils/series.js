import { FORMAT_LABELS } from '@/constants/filters';

const MILLISECONDS_PER_SECOND = 1000;

const STATUS_BADGES = {
  Upcoming: { key: 'upcoming', label: 'Upcoming' },
  Airing: { key: 'ongoing', label: 'Ongoing' },
  Finished: { key: 'completed', label: 'Completed' },
  Hiatus: { key: 'hiatus', label: 'On hiatus' },
  Cancelled: { key: 'cancelled', label: 'Cancelled' },
};

export const formatLabel = (format) => FORMAT_LABELS[format] || format;

export const isUpcoming = (series) => series.status === 'Upcoming';

export const hasAired = (series) => series.released > 0;

const episodeUnit = (series, episodeCount) => {
  if (series.released === 1 && series.format === 'MOVIE') return ' film';

  return episodeCount === 1 ? ' ep' : ' eps';
};

export const episodeCountText = (series) => {
  const plannedTotal =
    series.totalEpisodes && series.totalEpisodes !== series.released ? ` / ${series.totalEpisodes}` : '';

  const episodeCount = series.totalEpisodes ?? series.released;

  return `${series.released}${plannedTotal}${episodeUnit(series, episodeCount)}`;
};

export const releasedEpisodesText = (series) => {
  if (!hasAired(series)) return String(series.totalEpisodes ?? 'TBA');

  return series.totalEpisodes ? `${series.released} of ${series.totalEpisodes}` : `${series.released} so far`;
};

const premiereDate = (startedAt) =>
  new Date(startedAt).toLocaleDateString([], { timeZone: 'UTC', dateStyle: 'medium' });

const seasonOrYear = (series) => series.season || String(series.year || 'TBA');

export const premiereText = (series) => {
  if (!series.startedAt) return seasonOrYear(series);

  const verb = series.startedAt > Date.now() ? 'Starts' : 'Started';

  return `${verb} ${premiereDate(series.startedAt)}`;
};

export const nextAiringTime = (series) =>
  series.nextAiringAt
    ? new Date(series.nextAiringAt * MILLISECONDS_PER_SECOND).toLocaleString([], {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : null;

export const airingStatusText = (series) => {
  if (isUpcoming(series)) return premiereText(series);

  return series.status === 'Finished' ? 'Finished airing' : series.status;
};

export const episodeAge = (series, episodeNumber) => {
  if (series.status !== 'Airing') return String(series.year);

  const weeksAgo = series.released - episodeNumber;

  return weeksAgo === 0 ? 'This week' : `${weeksAgo} wk ago`;
};

export const statusBadge = (series) => STATUS_BADGES[series.status] ?? STATUS_BADGES.Finished;

export const seriesYearTag = (series) => (isUpcoming(series) ? seasonOrYear(series) : String(series.year || ''));

export const seriesDetail = (series) => {
  if (isUpcoming(series)) return series.startedAt ? premiereText(series) : '';
  if (series.format === 'MOVIE') return '';

  return episodeCountText(series);
};
