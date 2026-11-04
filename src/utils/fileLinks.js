import { matchSeriesFiles, parseEpisodeNumber } from '@/utils/episodeFiles';
import { withoutKey } from '@/utils/library';

const NO_LINKS = { folders: [], episodes: {} };
const FIRST_EPISODE = 1;
const SINGLE_EPISODE_RELEASE = 1;
const LAST_PATH_SEGMENT = /[\\/][^\\/]*$/;
const TRAILING_SEPARATORS = /[\\/]+$/;

export const linksOfSeries = (fileLinks, seriesId) => ({ ...NO_LINKS, ...fileLinks?.[seriesId] });

const withSeriesLinks = (fileLinks, seriesId, nextLinks) => {
  const otherSeriesLinks = withoutKey(fileLinks, seriesId);
  const hasAnyLink = nextLinks.folders.length > 0 || Object.keys(nextLinks.episodes).length > 0;

  return hasAnyLink ? { ...otherSeriesLinks, [seriesId]: nextLinks } : otherSeriesLinks;
};

export const withEpisodeFileLinked = (fileLinks, seriesId, episodeNumber, fileLocation) => {
  const links = linksOfSeries(fileLinks, seriesId);

  return withSeriesLinks(fileLinks, seriesId, {
    ...links,
    episodes: { ...links.episodes, [episodeNumber]: fileLocation },
  });
};

export const withEpisodeFileUnlinked = (fileLinks, seriesId, episodeNumber) => {
  const links = linksOfSeries(fileLinks, seriesId);

  return withSeriesLinks(fileLinks, seriesId, { ...links, episodes: withoutKey(links.episodes, episodeNumber) });
};

export const withFolderLinked = (fileLinks, seriesId, folderLocation) => {
  const links = linksOfSeries(fileLinks, seriesId);

  return withSeriesLinks(fileLinks, seriesId, { ...links, folders: [...new Set([...links.folders, folderLocation])] });
};

export const withFolderUnlinked = (fileLinks, seriesId, folderLocation) => {
  const links = linksOfSeries(fileLinks, seriesId);

  return withSeriesLinks(fileLinks, seriesId, {
    ...links,
    folders: links.folders.filter((linkedFolder) => linkedFolder !== folderLocation),
  });
};

const separatorOf = (root) => (root.startsWith('/') || (root.includes('/') && !root.includes('\\')) ? '/' : '\\');

export const locationInRoot = (root, relativePath) =>
  root ? `${root.replace(TRAILING_SEPARATORS, '')}${separatorOf(root)}${relativePath}` : relativePath;

export const pathInsideRoot = (root, location) => {
  const prefix = locationInRoot(root, '');

  return root && location.startsWith(prefix) ? location.slice(prefix.length) : location;
};

export const directoryOf = (file) =>
  LAST_PATH_SEGMENT.test(file.path) ? file.path.replace(LAST_PATH_SEGMENT, '') : '';

const movieFileInFolder = (filesInFolder) =>
  filesInFolder.find((file) => parseEpisodeNumber(file.name) === FIRST_EPISODE && !file.inProgress) ??
  filesInFolder.find((file) => !file.inProgress) ??
  filesInFolder[0];

const numberedEpisodesInFolder = (series, filesInFolder, earlierSeasonsEpisodeCount) => {
  const numberedFiles = filesInFolder
    .map((file) => ({ file, number: parseEpisodeNumber(file.name) }))
    .filter(({ number }) => number);

  const highestNumber = Math.max(0, ...numberedFiles.map(({ number }) => number));
  const continuesEarlierSeasons = earlierSeasonsEpisodeCount > 0 && highestNumber > series.released;

  return numberedFiles
    .map(({ file, number }) => [
      continuesEarlierSeasons && number > earlierSeasonsEpisodeCount ? number - earlierSeasonsEpisodeCount : number,
      file,
    ])
    .filter(([episodeNumber]) => episodeNumber >= FIRST_EPISODE && episodeNumber <= series.released);
};

const episodesInLinkedFolder = (series, filesInFolder, earlierSeasonsEpisodeCount) => {
  if (!filesInFolder.length) return [];

  return series.released === SINGLE_EPISODE_RELEASE
    ? [[FIRST_EPISODE, movieFileInFolder(filesInFolder)]]
    : numberedEpisodesInFolder(series, filesInFolder, earlierSeasonsEpisodeCount);
};

const filesDirectlyIn = (files, folderLocation, root) =>
  files.filter((file) => {
    const directory = directoryOf(file);

    return directory && locationInRoot(root, directory) === folderLocation;
  });

const linkedEpisodeFiles = (files, links, root) =>
  Object.entries(links.episodes).flatMap(([episodeNumber, fileLocation]) => {
    const file = files.find((candidate) => locationInRoot(root, candidate.path) === fileLocation);

    return file ? [[Number(episodeNumber), file]] : [];
  });

const withStrongerMatch = (matches, [episodeNumber, file]) => {
  const currentFile = matches.get(episodeNumber);
  const wouldHideFinishedFile = currentFile && !currentFile.inProgress && file.inProgress;

  return wouldHideFinishedFile ? matches : matches.set(episodeNumber, file);
};

export const matchLinkedSeriesFiles = (series, files, earlierSeasonsEpisodeCount, links, root = '') =>
  [
    ...links.folders.flatMap((folderLocation) =>
      episodesInLinkedFolder(series, filesDirectlyIn(files, folderLocation, root), earlierSeasonsEpisodeCount),
    ),

    ...linkedEpisodeFiles(files, links, root),
  ].reduce(withStrongerMatch, new Map(matchSeriesFiles(series, files, earlierSeasonsEpisodeCount)));

export const filesMatchingSearch = (files, search) => {
  const normalizedSearch = search.trim().toLowerCase();

  return files.filter((file) => !file.inProgress && file.path.toLowerCase().includes(normalizedSearch));
};

export const foldersOfFiles = (files) => {
  const fileCounts = files
    .map(directoryOf)
    .filter(Boolean)
    .reduce((counts, folder) => counts.set(folder, (counts.get(folder) ?? 0) + 1), new Map());

  return [...fileCounts]
    .map(([folder, fileCount]) => ({ folder, fileCount }))
    .sort((first, second) => first.folder.localeCompare(second.folder));
};

const seasonEpisodeOfNumber = (number, series, earlierSeasonsEpisodeCount) => {
  if (number <= series.released) return number;

  const continuedEpisode = number - earlierSeasonsEpisodeCount;

  return continuedEpisode >= FIRST_EPISODE && continuedEpisode <= series.released ? continuedEpisode : FIRST_EPISODE;
};

export const suggestedEpisodeForFile = (file, series, preferredEpisode, earlierSeasonsEpisodeCount = 0) => {
  if (preferredEpisode) return preferredEpisode;

  const namedEpisode = parseEpisodeNumber(file.name);

  return namedEpisode ? seasonEpisodeOfNumber(namedEpisode, series, earlierSeasonsEpisodeCount) : FIRST_EPISODE;
};

export const isLinkableEpisode = (episodeNumber, series) =>
  Number.isInteger(episodeNumber) && episodeNumber >= FIRST_EPISODE && episodeNumber <= series.released;
