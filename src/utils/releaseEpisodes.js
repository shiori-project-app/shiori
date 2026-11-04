import { parseEpisodeNumber } from '@/utils/episodeFiles';
import { markedSeason, seriesSeason } from '@/utils/titles';

const DAY_MS = 24 * 60 * 60 * 1000;
const PUBLISHED_BEFORE_PREMIERE_MS = 3 * DAY_MS;
const PUBLISHED_AFTER_FINALE_MS = 365 * DAY_MS;
const PUBLISHED_AFTER_FINALE_WITH_SEQUEL_MS = 42 * DAY_MS;
const RELEASED_BEFORE_AIRING_MS = DAY_MS / 4;
const RELEASED_AFTER_AIRING_MS = 2 * DAY_MS;
const SHIFT_CORRECTIONS_BY_PRIORITY = [0, 1, -1];
const NO_CORRECTION = 0;

const withoutReleaseTags = (title) =>
  title
    .replace(/\.[a-z0-9]{2,4}$/i, '')
    .replace(/\[[^\]]*\]|\([^)]*\)|\{[^}]*\}/g, ' ')
    .trim();

const seasonEpisodeCount = (series) => Math.max(series.totalEpisodes ?? 0, series.released ?? 0);

const publishedWhileAiring = (series, publishedAt, now) => {
  if (!series.startedAt || !publishedAt) return true;

  const afterFinaleAllowance = series.hasSequel ? PUBLISHED_AFTER_FINALE_WITH_SEQUEL_MS : PUBLISHED_AFTER_FINALE_MS;

  return (
    publishedAt >= series.startedAt - PUBLISHED_BEFORE_PREMIERE_MS &&
    publishedAt <= (series.endedAt ?? now) + afterFinaleAllowance
  );
};

const cameOutAsAired = (schedule, episodeNumber, publishedAt) =>
  schedule?.[episodeNumber] != null &&
  publishedAt >= schedule[episodeNumber] - RELEASED_BEFORE_AIRING_MS &&
  publishedAt <= schedule[episodeNumber] + RELEASED_AFTER_AIRING_MS;

const readSeasonMarkedRelease = ({
  number,
  markedSeasonNumber,
  season,
  isSeasonKnown,
  episodeCount,
  sameSeasonOffset,
}) => {
  if (isSeasonKnown && markedSeasonNumber !== season) return null;
  if (!isSeasonKnown && markedSeasonNumber === 1) return null;

  const continuesAcrossParts = episodeCount && number > episodeCount && sameSeasonOffset > 0;

  return {
    number,
    shift: continuesAcrossParts ? sameSeasonOffset : 0,
    verified: isSeasonKnown && sameSeasonOffset === 0,
  };
};

const readRelease = (series, release, { offset = 0, sameSeasonOffset = 0 }) => {
  const number = parseEpisodeNumber(release.title);

  if (number == null) return null;

  const season = seriesSeason(series);
  const isSeasonKnown = season > 1 || offset === 0;

  const markedSeasonNumber = markedSeason(withoutReleaseTags(release.title));

  if (markedSeasonNumber != null) {
    return readSeasonMarkedRelease({
      number,
      markedSeasonNumber,
      season,
      isSeasonKnown,
      episodeCount: seasonEpisodeCount(series),
      sameSeasonOffset,
    });
  }

  if (offset > 0 && number > offset) return { number, shift: offset, verified: true };

  return { number, shift: 0, verified: false };
};

const scheduleShiftCorrection = (releases, readingById, schedule) => {
  const votesFor = (correction) =>
    releases.filter((release) => {
      const reading = readingById.get(release.id);

      return (
        reading?.shift && cameOutAsAired(schedule, reading.number - reading.shift - correction, release.publishedAt)
      );
    }).length;

  const voteCounts = new Map(SHIFT_CORRECTIONS_BY_PRIORITY.map((correction) => [correction, votesFor(correction)]));

  return SHIFT_CORRECTIONS_BY_PRIORITY.reduce(
    (bestCorrection, correction) =>
      voteCounts.get(correction) > voteCounts.get(bestCorrection) ? correction : bestCorrection,
    NO_CORRECTION,
  );
};

export const releaseEpisodes = (series, releases, context = {}, now = Date.now()) => {
  const episodeCount = seasonEpisodeCount(series);
  const readingById = new Map(releases.map((release) => [release.id, readRelease(series, release, context)]));
  const correction = scheduleShiftCorrection(releases, readingById, context.schedule);

  const hasOtherSeasons = series.hasPrequel || series.hasSequel || context.offset > 0;

  const episodeOf = (release) => {
    const reading = readingById.get(release.id);

    if (!reading) return null;

    const episodeNumber = reading.number - reading.shift - (reading.shift ? correction : 0);

    if (episodeNumber < 1 || (episodeCount && episodeNumber > episodeCount)) return null;
    if (!reading.verified && hasOtherSeasons && !publishedWhileAiring(series, release.publishedAt, now)) return null;

    return episodeNumber;
  };

  return new Map(releases.map((release) => [release.id, episodeOf(release)]));
};
