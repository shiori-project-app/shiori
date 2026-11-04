import { fetchEpisodes } from '@/api/services/animeHeavenService';
import { fetchEpisodeOffset } from '@/api/services/seasonService';
import { refreshSeries } from '@/api/services/seriesRegistry';
import { episodeRelease, findSubsPleaseShow, loadShow, releaseMagnet } from '@/api/services/subsPleaseService';
import { findEpisodeTorrent, openMagnetInTorrentApp } from '@/api/services/torrentService';
import { mapSequentially } from '@/utils/async';
import { episodeNumbersInRange } from '@/utils/episodes';
import { linksOfSeries, matchLinkedSeriesFiles } from '@/utils/fileLinks';
import { pluralize } from '@/utils/format';
import { isRetryable } from '@shared/downloadStates';

const episodesInQueue = (downloads, seriesId) =>
  new Set(
    downloads
      .filter((download) => download.seriesId === seriesId && !isRetryable(download))
      .map((download) => download.episode),
  );

const wantedEpisodes = async ({ series, entry, files, root, downloads, fileLinks }) => {
  const localEpisodeFiles = matchLinkedSeriesFiles(
    series,
    files,
    await fetchEpisodeOffset(series.id),
    linksOfSeries(fileLinks, series.id),
    root,
  );

  const queuedEpisodes = episodesInQueue(downloads, series.id);
  const handledEpisodes = new Set(entry.handled);

  return episodeNumbersInRange(entry.fromEpisode, series.released).filter(
    (episodeNumber) =>
      !localEpisodeFiles.has(episodeNumber) &&
      !queuedEpisodes.has(episodeNumber) &&
      !handledEpisodes.has(episodeNumber),
  );
};

const sendEachAvailable = async (episodeNumbers, findMagnet, series) => {
  const outcome = { sentEpisodes: [], failure: null };

  await mapSequentially(episodeNumbers, async (episodeNumber) => {
    if (outcome.failure) return;

    try {
      const magnet = await findMagnet(episodeNumber);

      if (!magnet) return;

      await openMagnetInTorrentApp(magnet, series);
      outcome.sentEpisodes.push(episodeNumber);
    } catch (error) {
      outcome.failure = error;
    }
  });

  return outcome;
};

const downloadFromAnimeHeaven = async ({ series, entry, episodeNumbers, queueEpisodes }) => {
  const availableEpisodes = (await fetchEpisodes(entry.ahCode)).filter(({ episodeNumber }) =>
    episodeNumbers.includes(episodeNumber),
  );

  const sentEpisodes = availableEpisodes.length ? (await queueEpisodes(series, availableEpisodes)).queued : [];

  return { sentEpisodes, failure: null };
};

const downloadFromSubsPlease = async ({ series, entry, episodeNumbers }) => {
  const foundShow = entry.spShow ? await loadShow(series, entry.spShow) : await findSubsPleaseShow(series);

  const magnetForEpisode = (episodeNumber) => {
    const release = episodeRelease(foundShow, episodeNumber);

    return release && releaseMagnet(release, entry.resolution)?.magnet;
  };

  return sendEachAvailable(episodeNumbers, magnetForEpisode, series);
};

const downloadFromNyaa = async ({ series, entry, episodeNumbers }) => {
  const magnetForEpisode = async (episodeNumber) => (await findEpisodeTorrent(series, episodeNumber, entry))?.magnet;

  return sendEachAvailable(episodeNumbers, magnetForEpisode, series);
};

const DOWNLOADERS_BY_SOURCE = {
  animeheaven: downloadFromAnimeHeaven,
  subsplease: downloadFromSubsPlease,
  nyaa: downloadFromNyaa,
};

const checkResultMessage = (downloadedEpisodes, missingCount, failure) => {
  const missingText = `${pluralize(missingCount, 'episode')} not available yet`;

  if (!downloadedEpisodes.length) return missingText;

  const failureText = failure ? ` · stopped by an error: ${failure.message}` : '';

  return `Got EP ${downloadedEpisodes.join(', ')}${failureText}${missingCount ? ` · ${missingText}` : ''}`;
};

export const checkTrackedShow = async ({ seriesId, entry, files, root, downloads, fileLinks, queueEpisodes }) => {
  const [series] = await refreshSeries([seriesId]);

  if (!series) return { done: [], message: 'Not found on AniList' };

  const episodeNumbers = await wantedEpisodes({ series, entry, files, root, downloads, fileLinks });

  if (!episodeNumbers.length) {
    const waitingText = series.nextEpisode ? ` · waiting for EP ${series.nextEpisode}` : '';

    return { series, done: [], waitingForRelease: false, message: `Up to date${waitingText}` };
  }

  const downloadEpisodes = DOWNLOADERS_BY_SOURCE[entry.source] ?? downloadFromNyaa;

  const { sentEpisodes: downloadedEpisodes, failure } = await downloadEpisodes({
    series,
    entry,
    episodeNumbers,
    queueEpisodes,
  });

  if (failure && !downloadedEpisodes.length) throw failure;

  const missingCount = episodeNumbers.length - downloadedEpisodes.length;

  return {
    series,
    done: downloadedEpisodes,
    waitingForRelease: missingCount > 0,
    message: checkResultMessage(downloadedEpisodes, missingCount, failure),
  };
};
