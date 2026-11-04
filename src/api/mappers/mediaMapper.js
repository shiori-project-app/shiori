import { seasonLabel } from '@/utils/season';
import { isFranchiseEdge } from '@/utils/watchOrder';

const STATUS_LABELS = { RELEASING: 'Airing', HIATUS: 'Hiatus', CANCELLED: 'Cancelled' };
const DEFAULT_EPISODE_MINUTES = 24;
const SECONDS_PER_MINUTE = 60;
const MAX_GENRES_SHOWN = 4;
const MAX_SYNONYM_LENGTH = 80;
const LATIN_SCRIPT = /^[\x20-\x7E’]+$/;
const SYNOPSIS_MAX_LENGTH = 700;
const SYNOPSIS_MIN_SENTENCE_CUT = 300;
const STREAMING_TITLE = /^\s*Episode\s*(\d+)\s*[-–:]\s*(.+)$/i;
const UNUSABLE_LIST = null;

const toUtcTime = (date) => (date?.day ? Date.UTC(date.year, date.month - 1, date.day) : null);

const toReleaseKey = (date) =>
  date?.year ? date.year * 10000 + (date.month || 12) * 100 + (date.day || 31) : Number.MAX_SAFE_INTEGER;

const parseStreamingTitle = (item) => {
  const match = STREAMING_TITLE.exec(item.title || '');

  return match ? { episodeNumber: Number(match[1]), title: match[2].trim(), thumb: item.thumbnail || '' } : null;
};

const episodeNumberShift = (parsedEpisodes, seasonEpisodeCount, isLaterSeason) => {
  const episodeNumbers = parsedEpisodes.map((episode) => episode.episodeNumber);
  const firstNumber = Math.min(...episodeNumbers);
  const lastNumber = Math.max(...episodeNumbers);

  if (!seasonEpisodeCount || lastNumber <= seasonEpisodeCount) return 0;
  if (isLaterSeason && firstNumber > 1 && parsedEpisodes.length === seasonEpisodeCount) return firstNumber - 1;

  const hasOnlyOneBonusEntry =
    firstNumber <= 1 && parsedEpisodes.length <= seasonEpisodeCount + 1 && lastNumber <= seasonEpisodeCount + 1;

  return hasOnlyOneBonusEntry ? 0 : UNUSABLE_LIST;
};

export const parseStreamingEpisodes = (streamingEpisodes, seasonEpisodeCount, { laterSeason = false } = {}) => {
  const parsedEpisodes = (streamingEpisodes || []).map(parseStreamingTitle).filter(Boolean);

  if (!parsedEpisodes.length) return {};

  const shift = episodeNumberShift(parsedEpisodes, seasonEpisodeCount, laterSeason);

  if (shift === UNUSABLE_LIST) return {};

  return parsedEpisodes.reduce((episodesByNumber, { episodeNumber, title, thumb }) => {
    const seasonEpisodeNumber = episodeNumber - shift;
    const isOutsideSeason = seasonEpisodeCount && seasonEpisodeNumber > seasonEpisodeCount;

    if (isOutsideSeason || episodesByNumber[seasonEpisodeNumber]) return episodesByNumber;

    return { ...episodesByNumber, [seasonEpisodeNumber]: { title, thumb } };
  }, {});
};

const stripMarkup = (text) =>
  (text || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\(Source:[^)]*\)|\[Written by[^\]]*\]|\(Written by[^)]*\)/gi, '')
    .replace(/\s*\n\s*/g, ' ')
    .trim();

const shortenSynopsis = (text) => {
  if (text.length <= SYNOPSIS_MAX_LENGTH) return text;

  const cut = text.slice(0, SYNOPSIS_MAX_LENGTH);
  const lastSentenceEnd = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));

  return lastSentenceEnd > SYNOPSIS_MIN_SENTENCE_CUT
    ? cut.slice(0, lastSentenceEnd + 1)
    : `${cut.replace(/\s+\S*$/, '')}…`;
};

const cleanSynopsis = (description) => shortenSynopsis(stripMarkup(description));

const seriesStatus = (media, isUpcoming) => {
  if (isUpcoming) return 'Upcoming';
  if (media.nextAiringEpisode) return 'Airing';

  return STATUS_LABELS[media.status] || 'Finished';
};

const releasedEpisodeCount = (media, isUpcoming) => {
  if (isUpcoming) return 0;

  const nextEpisode = media.nextAiringEpisode;

  return Math.max(1, nextEpisode ? nextEpisode.episode - 1 : media.episodes || 1);
};

export const mapMedia = (media) => {
  const nextEpisode = media.nextAiringEpisode;
  const isUpcoming = media.status === 'NOT_YET_RELEASED';

  const relationEdges = media.relations?.edges ?? [];
  const relationTypes = relationEdges.map((edge) => edge.relationType);

  const genres = media.genres || [];
  const hasPrequel = relationTypes.includes('PREQUEL');

  return {
    id: media.id,
    malId: media.idMal,
    title: media.title.english || media.title.romaji,
    romajiTitle: media.title.romaji,
    englishTitle: media.title.english || null,
    nativeTitle: media.title.native || '',
    genres: genres.slice(0, MAX_GENRES_SHOWN),
    isEcchi: genres.includes('Ecchi'),
    year: media.seasonYear || media.startDate?.year || '',
    season: media.season && media.seasonYear ? seasonLabel({ season: media.season, year: media.seasonYear }) : '',
    startedAt: toUtcTime(media.startDate),
    endedAt: toUtcTime(media.endDate),
    releaseKey: toReleaseKey(media.startDate),

    synonyms: (media.synonyms || []).filter(
      (synonym) => LATIN_SCRIPT.test(synonym) && synonym.length <= MAX_SYNONYM_LENGTH,
    ),

    totalEpisodes: media.episodes,
    nextEpisode: nextEpisode?.episode ?? null,
    nextAiringAt: nextEpisode?.airingAt ?? null,
    rating: media.averageScore ? media.averageScore / 10 : null,
    popularity: media.popularity ?? 0,
    status: seriesStatus(media, isUpcoming),
    format: media.format,
    studio: media.studios.nodes[0]?.name || '',
    synopsis: cleanSynopsis(media.description),
    cover: media.coverImage.large,
    coverLarge: media.coverImage.extraLarge,
    banner: media.bannerImage,
    duration: (media.duration || DEFAULT_EPISODE_MINUTES) * SECONDS_PER_MINUTE,
    released: releasedEpisodeCount(media, isUpcoming),
    hasPrequel,
    hasSequel: relationTypes.includes('SEQUEL'),
    hasWatchOrder: relationEdges.some(isFranchiseEdge),

    streamingEpisodes: parseStreamingEpisodes(
      media.streamingEpisodes,
      media.episodes ?? (nextEpisode ? nextEpisode.episode - 1 : null),
      { laterSeason: hasPrequel },
    ),
  };
};
