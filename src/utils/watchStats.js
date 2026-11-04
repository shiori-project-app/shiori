import { twoDigits } from '@/utils/format';
import { watchedCount } from '@/utils/watched';

const countInto = (counts, key) => counts.set(key, (counts.get(key) ?? 0) + 1);

const monthKey = (date) => `${date.getFullYear()}-${twoDigits(date.getMonth() + 1)}`;

const recentMonthStarts = (now, monthCount) =>
  Array.from(
    { length: monthCount },
    (_, index) => new Date(now.getFullYear(), now.getMonth() - (monthCount - 1 - index), 1),
  );

const watchedSeriesEntries = (watched, seriesById) =>
  Object.keys(watched)
    .map(Number)
    .map((seriesId) => ({ series: seriesById(seriesId), episodes: watchedCount(watched, seriesId) }))
    .filter((entry) => entry.series && entry.episodes > 0);

export const secondsWatched = (seriesEntries) =>
  seriesEntries.reduce((total, { series, episodes }) => total + episodes * (series.duration ?? 0), 0);

export const topGenres = (seriesEntries, limit) =>
  [...seriesEntries.flatMap(({ series }) => series.genres ?? []).reduce(countInto, new Map())]
    .map(([genre, showCount]) => ({ genre, showCount }))
    .sort((first, second) => second.showCount - first.showCount || first.genre.localeCompare(second.genre))
    .slice(0, limit);

export const episodesPerMonth = (watchDates, monthCount, now = Date.now()) => {
  const episodesByMonth = Object.values(watchDates)
    .map((watchedAt) => monthKey(new Date(watchedAt)))
    .reduce(countInto, new Map());

  return recentMonthStarts(new Date(now), monthCount).map((monthStart) => ({
    month: monthKey(monthStart),
    startsAt: monthStart.getTime(),
    episodes: episodesByMonth.get(monthKey(monthStart)) ?? 0,
  }));
};

export const watchStats = ({ watched, watchDates, seriesById, genreCount, monthCount, now = Date.now() }) => {
  const seriesEntries = watchedSeriesEntries(watched, seriesById);

  return {
    episodeCount: Object.values(watched).reduce((total, episodes) => total + episodes.length, 0),
    showCount: Object.values(watched).filter((episodes) => episodes.length > 0).length,
    secondsWatched: secondsWatched(seriesEntries),
    genres: topGenres(seriesEntries, genreCount),
    months: episodesPerMonth(watchDates, monthCount, now),
    hasWatchDates: Object.keys(watchDates).length > 0,
  };
};
