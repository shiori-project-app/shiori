import { getFileSizes } from '@/api/clients/desktopClient';
import { fetchKnownEpisodeOffset } from '@/api/services/seasonService';
import { getCachedSeries, loadSeries } from '@/api/services/seriesRegistry';
import { mapSequentially } from '@/utils/async';
import { hasFilesNamingSeries } from '@/utils/episodeFiles';
import { linksOfSeries, matchLinkedSeriesFiles } from '@/utils/fileLinks';
import { cleanupCutoff, findCleanupCandidates, seriesIdsWithDueEpisodes } from '@/utils/watchedCleanup';

const NOTHING_TO_CLEAN = { candidates: [], skippedShows: 0 };

const matchSeries = async (seriesId, { files, root, fileLinks }) => {
  const series = getCachedSeries(seriesId);

  if (!series) return { isSkipped: true };

  const links = linksOfSeries(fileLinks, seriesId);

  if (!links.folders.length && !Object.keys(links.episodes).length && !hasFilesNamingSeries(series, files)) {
    return { isSkipped: false, filesByEpisode: new Map(), series, links };
  }

  const earlierSeasonsEpisodeCount = await fetchKnownEpisodeOffset(seriesId);

  if (earlierSeasonsEpisodeCount == null) return { isSkipped: true };

  return {
    isSkipped: false,
    filesByEpisode: matchLinkedSeriesFiles(series, files, earlierSeasonsEpisodeCount, links, root),
    series,
    links,
  };
};

const withFileSizes = async (candidates) => {
  if (!candidates.length) return candidates;

  const bytesByPath = await getFileSizes(candidates.map((candidate) => candidate.path));

  return candidates.map((candidate) => ({ ...candidate, bytes: bytesByPath[candidate.path] ?? 0 }));
};

export const findWatchedEpisodesToClean = async ({ scan, library, fileLinks, afterDays, now = Date.now() }) => {
  const cutoff = cleanupCutoff(afterDays, now);
  const seriesIds = seriesIdsWithDueEpisodes(library, cutoff);

  if (!scan.files.length || !seriesIds.length) return NOTHING_TO_CLEAN;

  await loadSeries(seriesIds);

  const matches = await mapSequentially(seriesIds, (seriesId) =>
    matchSeries(seriesId, { files: scan.files, root: scan.root, fileLinks }),
  );

  const candidates = findCleanupCandidates({
    seriesMatches: matches.filter((match) => !match.isSkipped),
    library,
    cutoff,
    root: scan.root,
  });

  return {
    candidates: await withFileSizes(candidates),
    skippedShows: matches.filter((match) => match.isSkipped).length,
  };
};
