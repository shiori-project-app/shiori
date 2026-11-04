import { chunk } from '@/utils/arrays';
import { mapSequentially, sleep } from '@/utils/async';
import { parseEpisodeId } from '@/utils/episodes';
import { linksOfSeries, matchLinkedSeriesFiles } from '@/utils/fileLinks';

const HOUR_MS = 60 * 60 * 1000;
const ENTRIES_MATCHED_PER_STEP = 20;
const NO_LINK_INPUTS = { fileLinks: {}, root: '' };

export const SAVED_SERIES_REFRESH_MS = 24 * HOUR_MS;

const SAVED_FINISHED_SERIES_LIFETIME_MS = 7 * 24 * HOUR_MS;
const SAVED_SERIES_LIFETIME_MS = 6 * HOUR_MS;
const MILLISECONDS_PER_SECOND = 1000;

export const hasNextEpisodeAired = (series, now) =>
  Boolean(series.nextAiringAt) && series.nextAiringAt * MILLISECONDS_PER_SECOND <= now;

export const isSavedSeriesFresh = ({ series, savedAt, seriesFetchedAt }, now) => {
  const fetchedAt = seriesFetchedAt ?? savedAt;
  const lifetime = series.status === 'Finished' ? SAVED_FINISHED_SERIES_LIFETIME_MS : SAVED_SERIES_LIFETIME_MS;

  return now >= fetchedAt && now - fetchedAt < lifetime && !hasNextEpisodeAired(series, now);
};

export const skipTimesKey = (malId, episodeNumber) => `${malId}:${episodeNumber}`;

const isSeriesId = (value) => Number.isInteger(value) && value > 0;

const numericKeys = (record) => Object.keys(record).map(Number);

const matchesByScan = new WeakMap();

const linksOfEntry = (entry, { fileLinks }) => linksOfSeries(fileLinks, entry.series.id);

const matchKey = (entry, linkInputs) => {
  const { series, episodeOffset } = entry;
  const links = JSON.stringify(linksOfEntry(entry, linkInputs));

  return `${series.id}|${series.title}|${series.romajiTitle}|${series.released}|${episodeOffset ?? 0}|${linkInputs.root}|${links}`;
};

const matchedFiles = (entry, files, linkInputs = NO_LINK_INPUTS) => {
  if (!matchesByScan.has(files)) matchesByScan.set(files, new Map());

  const matches = matchesByScan.get(files);
  const key = matchKey(entry, linkInputs);

  if (!matches.has(key)) {
    matches.set(
      key,
      matchLinkedSeriesFiles(
        entry.series,
        files,
        entry.episodeOffset ?? 0,
        linksOfEntry(entry, linkInputs),
        linkInputs.root,
      ),
    );
  }

  return matches.get(key);
};

export const prepareFileMatchesInSteps = (savedEntries, files, linkInputs = NO_LINK_INPUTS) =>
  mapSequentially(chunk(Object.values(savedEntries), ENTRIES_MATCHED_PER_STEP), async (entries) => {
    entries.forEach((entry) => matchedFiles(entry, files, linkInputs));
    await sleep(0);
  });

export const downloadedEpisodes = (entry, files, linkInputs = NO_LINK_INPUTS) =>
  [...matchedFiles(entry, files, linkInputs)]
    .filter(([, file]) => !file.inProgress)
    .map(([episodeNumber]) => episodeNumber);

export const seriesIdsToKeep = ({
  list,
  history,
  tracked,
  downloads,
  seriesWithLocalFiles,
  savedEntries,
  files,
  fileLinks = {},
  root = '',
}) => {
  const idsKeptByLibrary = new Set(
    [
      ...numericKeys(list),
      ...history.map((episodeIdText) => parseEpisodeId(episodeIdText).seriesId),
      ...numericKeys(tracked),
      ...numericKeys(fileLinks),
      ...downloads.map((download) => download.seriesId),
      ...seriesWithLocalFiles,
    ].filter(isSeriesId),
  );

  const idsKeptByFiles = Object.values(savedEntries)
    .filter(
      (entry) => !idsKeptByLibrary.has(entry.series.id) && matchedFiles(entry, files, { fileLinks, root }).size > 0,
    )
    .map((entry) => entry.series.id)
    .filter(isSeriesId);

  return new Set([...idsKeptByLibrary, ...idsKeptByFiles]);
};

export const savedIdsToRemove = (keptIds, savedEntries) =>
  numericKeys(savedEntries).filter((seriesId) => !keptIds.has(seriesId));

export const idsNeedingRefresh = (keptIds, savedEntries, now) =>
  [...keptIds].filter(
    (seriesId) => !savedEntries[seriesId] || now - savedEntries[seriesId].savedAt >= SAVED_SERIES_REFRESH_MS,
  );

export const needsEpisodeTitles = (series, savedEntry) =>
  Boolean(series.malId) && (savedEntry?.episodeTitlesUpTo ?? 0) < series.released;

export const episodesNeedingSkipTimes = (savedEntries, files, savedSkipTimes, linkInputs = NO_LINK_INPUTS) =>
  Object.values(savedEntries)
    .filter((entry) => entry.series.malId)
    .flatMap((entry) =>
      downloadedEpisodes(entry, files, linkInputs)
        .filter((episodeNumber) => !(skipTimesKey(entry.series.malId, episodeNumber) in savedSkipTimes))
        .map((episodeNumber) => ({ malId: entry.series.malId, episodeNumber })),
    );
