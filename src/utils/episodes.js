import { EPISODE_BLOCK_SIZE } from '@/config/app.config';

export const episodeId = (seriesId, episodeNumber) => `${seriesId}-${episodeNumber}`;

export const parseEpisodeId = (id) => {
  const [seriesId, episodeNumber] = id.split('-');

  return { seriesId: Number(seriesId), episodeNumber: Number(episodeNumber) };
};

export const buildEpisode = (series, episodeNumber, extraTitles = {}) => {
  const streamingEpisode = series.streamingEpisodes[episodeNumber];

  return {
    number: episodeNumber,
    id: episodeId(series.id, episodeNumber),
    seriesId: series.id,
    name: streamingEpisode?.title || extraTitles[episodeNumber] || '',
    thumb: streamingEpisode?.thumb || '',
    duration: series.duration,
  };
};

export const blockOf = (episodeNumber) => Math.floor((episodeNumber - 1) / EPISODE_BLOCK_SIZE);

export const blockCount = (series) => Math.ceil(series.released / EPISODE_BLOCK_SIZE);

export const blockRange = (series, blockIndex) => [
  blockIndex * EPISODE_BLOCK_SIZE + 1,
  Math.min(series.released, (blockIndex + 1) * EPISODE_BLOCK_SIZE),
];

export const episodeNumbersInRange = (firstEpisode, lastEpisode) =>
  Array.from({ length: Math.max(0, lastEpisode - firstEpisode + 1) }, (_, offset) => firstEpisode + offset);
