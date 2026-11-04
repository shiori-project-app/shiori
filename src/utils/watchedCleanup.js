import { episodeId } from '@/utils/episodes';
import { isInSeriesFolder, namesSeriesExactly } from '@/utils/episodeFiles';
import { directoryOf, locationInRoot } from '@/utils/fileLinks';

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export const cleanupCutoff = (afterDays, now) => now - afterDays * MILLISECONDS_PER_DAY;

const watchedAtOf = (seriesId, episodeNumber, { watched, watchDates }) =>
  watched[seriesId]?.includes(episodeNumber) ? watchDates[episodeId(seriesId, episodeNumber)] : undefined;

const isDue = (seriesId, episodeNumber, library, cutoff) => {
  const watchedAt = watchedAtOf(seriesId, episodeNumber, library);

  return Boolean(watchedAt) && watchedAt <= cutoff;
};

export const seriesIdsWithDueEpisodes = (library, cutoff) =>
  Object.keys(library.watched)
    .map(Number)
    .filter((seriesId) => library.watched[seriesId].some((number) => isDue(seriesId, number, library, cutoff)));

const isLinkedByHand = (file, links, root) =>
  Object.values(links.episodes).includes(locationInRoot(root, file.path)) ||
  links.folders.includes(locationInRoot(root, directoryOf(file)));

const isConfidentMatch = (series, file, links, root) =>
  isInSeriesFolder(series, file) || isLinkedByHand(file, links, root) || namesSeriesExactly(series, file);

const claimsOnFiles = (seriesMatches, library, cutoff, root) =>
  seriesMatches.flatMap(({ series, filesByEpisode, links }) =>
    [...filesByEpisode].map(([episodeNumber, file]) => ({
      file,
      series,
      episodeNumber,
      isDue: isDue(series.id, episodeNumber, library, cutoff),
      isConfident: isConfidentMatch(series, file, links, root),
      watchedAt: watchedAtOf(series.id, episodeNumber, library),
    })),
  );

const claimsByFilePath = (claims) =>
  claims.reduce(
    (groups, claim) => groups.set(claim.file.path, [...(groups.get(claim.file.path) ?? []), claim]),
    new Map(),
  );

const toCandidate = (claims) => {
  const [{ file, series, episodeNumber }] = claims;

  return {
    path: file.path,
    name: file.name,
    series,
    episodeNumber,
    episodes: claims.map((claim) => ({ seriesId: claim.series.id, episodeNumber: claim.episodeNumber })),
    watchedAt: Math.max(...claims.map((claim) => claim.watchedAt)),
    isConfident: claims.every((claim) => claim.isConfident),
  };
};

const compareCandidates = (first, second) =>
  first.series.title.localeCompare(second.series.title) || first.episodeNumber - second.episodeNumber;

export const findCleanupCandidates = ({ seriesMatches, library, cutoff, root }) =>
  [...claimsByFilePath(claimsOnFiles(seriesMatches, library, cutoff, root)).values()]
    .filter((claims) => claims.every((claim) => claim.isDue && !claim.file.inProgress))
    .map(toCandidate)
    .sort(compareCandidates);

export const initiallySelectedPaths = (candidates) =>
  new Set(candidates.filter((candidate) => candidate.isConfident).map((candidate) => candidate.path));

export const episodesBySeries = (candidates) =>
  candidates
    .flatMap((candidate) => candidate.episodes)
    .reduce(
      (groups, { seriesId, episodeNumber }) => groups.set(seriesId, [...(groups.get(seriesId) ?? []), episodeNumber]),
      new Map(),
    );

export const totalBytes = (candidates) => candidates.reduce((total, candidate) => total + candidate.bytes, 0);
