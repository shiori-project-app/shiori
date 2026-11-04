import { SUBSPLEASE_RESOLUTIONS } from '@/constants/torrents';

const DEFAULT_SUBSPLEASE_RESOLUTION = '1080';

export const subsPleaseResolution = (preferredResolution) =>
  SUBSPLEASE_RESOLUTIONS.includes(preferredResolution) ? preferredResolution : DEFAULT_SUBSPLEASE_RESOLUTION;

const batchContains = (release, episodeNumber) =>
  release.isBatch && release.from <= episodeNumber && episodeNumber <= release.to;

export const releasesForEpisode = (releases, episodeNumber) =>
  releases.filter((release) => release.episodeNumber === episodeNumber || batchContains(release, episodeNumber));

export const releasesForSeason = (releases) => [
  ...releases.filter((release) => release.isBatch),
  ...releases.filter((release) => !release.isBatch),
];
