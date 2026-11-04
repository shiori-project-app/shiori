import { fetchText } from '@/api/clients/desktopClient';
import { SUBSPLEASE_URL } from '@/config/api.config';
import { SUBSPLEASE_RESOLUTIONS } from '@/constants/torrents';
import { findSequentially } from '@/utils/async';
import { looseTitle, releaseTitleVariants, seasonNumber, seriesSeason, withoutSeason } from '@/utils/titles';

const DAY_MS = 24 * 60 * 60 * 1000;
const DAYS_BEFORE_PREMIERE_ALLOWED = 2;
const DAYS_AFTER_FINALE_ALLOWED = 14;
const MIN_NICKNAME_LENGTH = 8;
const REVISION_SUFFIX = /v\d+/gi;

const parseEpisodeLabel = (label) => label.replace(REVISION_SUFFIX, '').split('-').map(Number);

const toRelease = ([id, apiRelease]) => {
  const [firstEpisode, lastEpisode] = parseEpisodeLabel(apiRelease.episode);

  return {
    id,
    show: apiRelease.show,
    label: apiRelease.episode,
    isBatch: Boolean(lastEpisode),
    episodeNumber: lastEpisode ? null : firstEpisode,
    from: firstEpisode,
    to: lastEpisode ?? firstEpisode,
    releasedAt: Date.parse(apiRelease.release_date) || null,
    magnets: Object.fromEntries(apiRelease.downloads.map((download) => [download.res, download.magnet])),
  };
};

const hasNumericEpisodes = (release) => Number.isFinite(release.from) && Number.isFinite(release.to);

const newestRevisions = (releases) => [
  ...releases
    .reduce((newestByEpisode, release) => {
      const episodeKey = `${release.show}|${release.from}-${release.to}`;
      const current = newestByEpisode.get(episodeKey);

      return (current?.releasedAt ?? -1) < (release.releasedAt ?? 0)
        ? newestByEpisode.set(episodeKey, release)
        : newestByEpisode;
    }, new Map())
    .values(),
];

const searchReleases = async (query) => {
  const responseText = await fetchText(
    `${SUBSPLEASE_URL}/api/?${new URLSearchParams({ f: 'search', tz: 'UTC', s: query })}`,
  );

  const releasesById = JSON.parse(responseText);

  if (Array.isArray(releasesById)) return [];

  return newestRevisions(Object.entries(releasesById).map(toRelease).filter(hasNumericEpisodes));
};

let showListRequest = null;

const fetchShowList = () => {
  showListRequest ??= fetchText(`${SUBSPLEASE_URL}/shows/`)
    .then((html) =>
      [...new DOMParser().parseFromString(html, 'text/html').querySelectorAll('.all-shows-link a')].map(
        (link) => link.getAttribute('title') || link.textContent.trim(),
      ),
    )
    .catch((error) => {
      showListRequest = null;

      throw error;
    });

  return showListRequest;
};

export const searchShowList = async (query) => {
  const wantedTitle = looseTitle(query);

  if (!wantedTitle) return [];

  return (await fetchShowList()).filter((title) => looseTitle(title).includes(wantedTitle));
};

const releaseTime = (release) => release.releasedAt ?? 0;

const newestFirst = (releases) => releases.sort((first, second) => releaseTime(second) - releaseTime(first));

const shiftRelease = (release, offset) => ({
  ...release,
  episodeNumber: release.episodeNumber && release.episodeNumber - offset,
  from: Math.max(1, release.from - offset),
  to: release.to - offset,
});

const singleReleasesForSeries = (releases, airedFrom, airedUntil, episodeCount) => {
  const singles = releases.filter((release) => !release.isBatch);

  const releasedWhileAiring = singles.filter(
    (release) => releaseTime(release) >= airedFrom && releaseTime(release) <= airedUntil,
  );

  if (releasedWhileAiring.length) return releasedWhileAiring;

  const releasedLater = singles.filter((release) => releaseTime(release) > airedUntil);

  const fitsEpisodeCount =
    releasedLater.length && Math.max(...releasedLater.map((release) => release.episodeNumber)) <= episodeCount;

  return fitsEpisodeCount ? releasedLater : [];
};

export const alignReleases = (series, releases) => {
  const airedFrom = series.startedAt ? series.startedAt - DAYS_BEFORE_PREMIERE_ALLOWED * DAY_MS : -Infinity;
  const airedUntil = series.endedAt ? series.endedAt + DAYS_AFTER_FINALE_ALLOWED * DAY_MS : Infinity;

  const episodeCount = Math.max(series.released, series.totalEpisodes ?? 0);
  const singles = singleReleasesForSeries(releases, airedFrom, airedUntil, episodeCount);

  const batches = releases.filter((release) => release.isBatch && releaseTime(release) >= airedFrom);

  if (!singles.length) return { offset: 0, releases: batches };

  const singleEpisodeNumbers = singles.map((release) => release.episodeNumber);
  const offset = Math.max(...singleEpisodeNumbers) > episodeCount ? Math.min(...singleEpisodeNumbers) - 1 : 0;

  return {
    offset,

    releases: [...singles, ...batches]
      .filter((release) => release.to > offset)
      .map((release) => shiftRelease(release, offset)),
  };
};

export const loadShow = async (series, show) => {
  const releases = (await searchReleases(show)).filter((release) => release.show === show);
  const aligned = alignReleases(series, releases);

  return { show, offset: aligned.offset, releases: newestFirst(aligned.releases) };
};

const loadShowIfReleased = async (series, show, hasWantedReleases) => {
  const foundShow = await loadShow(series, show);

  return hasWantedReleases(foundShow.releases) ? foundShow : null;
};

const hasAnyRelease = (releases) => releases.length > 0;

const hasSingleEpisodeRelease = (releases) => releases.some((release) => !release.isBatch);

const findBySeasonTitle = (series, titleVariants, showsByLooseTitle, season) => {
  const matchingShows = titleVariants
    .map((variant) => ({ variant, show: showsByLooseTitle.get(looseTitle(variant)) }))
    .filter(
      ({ variant, show }) =>
        show && (season === 1 || seasonNumber(show) === season || seasonNumber(variant) === season),
    )
    .map(({ show }) => show);

  return findSequentially(matchingShows, (show) => loadShowIfReleased(series, show, hasAnyRelease));
};

const findByBaseTitle = (series, titleVariants, showsByLooseTitle, season) => {
  if (season <= 1) return null;

  const baseShows = [...new Set(titleVariants.map(withoutSeason))]
    .map((baseTitle) => showsByLooseTitle.get(looseTitle(baseTitle)))
    .filter(Boolean);

  return findSequentially(baseShows, (show) => loadShowIfReleased(series, show, hasSingleEpisodeRelease));
};

const findByRomajiNickname = (series, showTitles, season) => {
  const romajiTitle = looseTitle(withoutSeason(series.romajiTitle ?? ''));

  const nicknameShows = showTitles
    .filter(
      (title) =>
        looseTitle(title).length >= MIN_NICKNAME_LENGTH &&
        romajiTitle.startsWith(looseTitle(title)) &&
        seasonNumber(title) === season,
    )
    .sort((first, second) => looseTitle(second).length - looseTitle(first).length);

  return findSequentially(nicknameShows, (show) => loadShowIfReleased(series, show, hasAnyRelease));
};

const findBySearch = (series, titleVariants, season) => {
  const wantedTitles = titleVariants.map(looseTitle);

  return findSequentially(titleVariants, async (query) => {
    const shows = [...new Set((await searchReleases(query)).map((release) => release.show))];

    const show =
      shows.find((candidate) => wantedTitles.includes(looseTitle(candidate))) ??
      shows.find((candidate) => seasonNumber(candidate) === season);

    return show ? loadShow(series, show) : null;
  });
};

const fetchShowListOrNull = () => fetchShowList().catch(() => null);

export const findSubsPleaseShow = async (series) => {
  const titleVariants = releaseTitleVariants(series);
  const season = seriesSeason(series);

  const showTitles = await fetchShowListOrNull();

  if (!showTitles) return findBySearch(series, titleVariants, season);

  const showsByLooseTitle = new Map(showTitles.map((title) => [looseTitle(title), title]));

  return (
    (await findBySeasonTitle(series, titleVariants, showsByLooseTitle, season)) ??
    (await findByBaseTitle(series, titleVariants, showsByLooseTitle, season)) ??
    (await findByRomajiNickname(series, showTitles, season))
  );
};

export const episodeRelease = (foundShow, episodeNumber) =>
  foundShow?.releases.find((release) => release.episodeNumber === episodeNumber) ?? null;

export const releaseMagnet = (release, preferredResolution) => {
  const resolutionOrder = [
    preferredResolution,
    ...SUBSPLEASE_RESOLUTIONS.filter((resolution) => resolution !== preferredResolution),
  ];

  const availableResolution = resolutionOrder.find((resolution) => release.magnets[resolution]);

  return availableResolution ? { resolution: availableResolution, magnet: release.magnets[availableResolution] } : null;
};
