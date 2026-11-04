import { safeName } from '@shared/fileNames';
import {
  markedSeason,
  normalizeTitle,
  seasonNumber,
  seriesSeason,
  straightQuotes,
  withoutSeason,
} from '@/utils/titles';

const SEASON_EPISODE_CODE = /\bS\d{1,2}E(\d{1,4})\b/i;
const EPISODE_WORD_NUMBER = /\b(?:EP?|Episode)\s?\.?(\d{1,4})\b/i;
const DASH_SEPARATED_NUMBER = /\s[-–]\s(\d{1,4})(?:v\d)?\b/;
const TRAILING_NUMBER = /\s(\d{1,4})(?:v\d)?\s*$/;
const EPISODE_PATTERNS = [SEASON_EPISODE_CODE, EPISODE_WORD_NUMBER, DASH_SEPARATED_NUMBER, TRAILING_NUMBER];

const SEASON_MARK = /\bseason\s*\d+\b|\b\d+(?:st|nd|rd|th)\s+season\b|\bs\d{1,2}\b(?!\s*e\d)/gi;
const BATCH_WORD = /\bbatch\b/i;
const EPISODE_RANGE = /\s[-–]\s\d{1,4}\s*[-~]\s*\d{1,4}\b|\bS\d{1,2}E\d{1,4}\s*[-~]\s*E?\d{1,4}\b/i;
const FILE_EXTENSION = /\.[a-z0-9]{2,4}$/i;
const BRACKETED_TAGS = /\[[^\]]*\]|\([^)]*\)|\{[^}]*\}/g;
const SQUARE_AND_ROUND_TAGS = /\[[^\]]*\]|\([^)]*\)/g;
const MIN_TITLE_LENGTH = 3;
const MOVIE_EPISODE = 1;

const episodeNameCore = (name) =>
  name.replace(FILE_EXTENSION, '').replace(BRACKETED_TAGS, ' ').replace(/[._]/g, ' ').replace(SEASON_MARK, ' ').trim();

export const parseEpisodeNumber = (name) => {
  if (BATCH_WORD.test(name)) return null;

  const nameCore = episodeNameCore(name);

  if (EPISODE_RANGE.test(nameCore)) return null;

  const match = EPISODE_PATTERNS.map((pattern) => pattern.exec(nameCore)).find(Boolean);

  return match ? Number(match[1]) : null;
};

const comparableTitles = (series) =>
  [series.romajiTitle, series.title]
    .filter(Boolean)
    .map((title) => normalizeTitle(withoutSeason(straightQuotes(title))))
    .filter((title) => title.length >= MIN_TITLE_LENGTH);

const factsByFile = new WeakMap();

const factsOf = (file) => {
  if (!factsByFile.has(file)) {
    factsByFile.set(file, {
      episodeNumber: parseEpisodeNumber(file.name),
      normalizedName: normalizeTitle(file.name),
      season: seasonNumber(file.name),
      safeFolder: file.folder ? safeName(file.folder) : '',
    });
  }

  return factsByFile.get(file);
};

const fileEpisodeNumber = (series, file, isInShowFolder) =>
  factsOf(file).episodeNumber ?? (isInShowFolder && series.released === 1 ? MOVIE_EPISODE : null);

const namesItsOwnSeasonNumbering = (file, showFolder) =>
  markedSeason(file.name.replace(SQUARE_AND_ROUND_TAGS, ' ')) != null || file.name.startsWith(`${showFolder} - `);

const belongsToSeriesByName = (file, seriesTitles, season, isContinuedNumbering) => {
  const { normalizedName, season: fileSeason } = factsOf(file);

  if (!seriesTitles.some((title) => normalizedName.includes(title))) return false;

  return fileSeason === season || (isContinuedNumbering && fileSeason === 1);
};

export const isInSeriesFolder = (series, file) => factsOf(file).safeFolder === safeName(series.title);

const textBeforeEpisodeNumber = (nameCore) => {
  const episodeMatch = EPISODE_PATTERNS.map((pattern) => pattern.exec(nameCore)).find(Boolean);

  return episodeMatch ? nameCore.slice(0, episodeMatch.index) : nameCore;
};

export const namesSeriesExactly = (series, file) => {
  const fileTitle = textBeforeEpisodeNumber(episodeNameCore(file.name));

  return comparableTitles(series).includes(normalizeTitle(withoutSeason(straightQuotes(fileTitle))));
};

export const hasFilesNamingSeries = (series, files) => {
  const showFolder = safeName(series.title);
  const seriesTitles = comparableTitles(series);

  return files.some((file) => {
    const { safeFolder, normalizedName } = factsOf(file);

    return safeFolder === showFolder || seriesTitles.some((title) => normalizedName.includes(title));
  });
};

export const matchSeriesFiles = (series, files, earlierSeasonsEpisodeCount = 0) => {
  const showFolder = safeName(series.title);
  const seriesTitles = comparableTitles(series);

  const season = seriesSeason(series);

  return files.reduce((filesByEpisode, file) => {
    const isInShowFolder = factsOf(file).safeFolder === showFolder;
    const episodeNumber = fileEpisodeNumber(series, file, isInShowFolder);

    if (!episodeNumber) return filesByEpisode;

    const isContinuedNumbering =
      earlierSeasonsEpisodeCount > 0 &&
      episodeNumber > earlierSeasonsEpisodeCount &&
      !namesItsOwnSeasonNumbering(file, showFolder);

    if (!isInShowFolder && !belongsToSeriesByName(file, seriesTitles, season, isContinuedNumbering)) {
      return filesByEpisode;
    }

    const seasonEpisodeNumber = isContinuedNumbering ? episodeNumber - earlierSeasonsEpisodeCount : episodeNumber;
    const currentFile = filesByEpisode.get(seasonEpisodeNumber);
    const keepsCurrentFile = currentFile && (!currentFile.inProgress || file.inProgress);

    return keepsCurrentFile ? filesByEpisode : filesByEpisode.set(seasonEpisodeNumber, file);
  }, new Map());
};
