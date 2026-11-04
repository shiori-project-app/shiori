import { jikanGet } from '@/api/clients/jikanClient';
import { findSavedEpisodeTitles } from '@/api/services/offlineStore';
import { JIKAN_EPISODES_PER_PAGE } from '@/config/api.config';
import { rememberRequest } from '@/utils/async';
import { episodeNumbersInRange } from '@/utils/episodes';

const PLACEHOLDER_EPISODE_TITLE = /^episode\s*\d+$/i;

const titlePageRequests = new Map();

const toEpisodeTitles = (response) =>
  Object.fromEntries(
    (response.data || [])
      .map((jikanEpisode) => [jikanEpisode.mal_id, (jikanEpisode.title || '').trim()])
      .filter(([episodeNumber, title]) => episodeNumber && title && !PLACEHOLDER_EPISODE_TITLE.test(title)),
  );

const loadTitlePage = (malId, pageNumber) =>
  rememberRequest(titlePageRequests, `${malId}:${pageNumber}`, () =>
    jikanGet(`/anime/${malId}/episodes?page=${pageNumber}`).then(toEpisodeTitles),
  );

const jikanPageOf = (episodeNumber) => Math.ceil(episodeNumber / JIKAN_EPISODES_PER_PAGE);

export const requestEpisodeTitles = async (series, firstEpisode, lastEpisode) => {
  if (!series.malId) return {};

  const neededPages = new Set(
    episodeNumbersInRange(firstEpisode, lastEpisode)
      .filter((episodeNumber) => !series.streamingEpisodes[episodeNumber]?.title)
      .map(jikanPageOf),
  );

  const titlePages = await Promise.all([...neededPages].map((pageNumber) => loadTitlePage(series.malId, pageNumber)));

  return Object.assign({}, ...titlePages);
};

export const fetchEpisodeTitles = async (series, firstEpisode, lastEpisode) => {
  const fetchedTitles = await requestEpisodeTitles(series, firstEpisode, lastEpisode).catch(() => ({}));

  return { ...(await findSavedEpisodeTitles(series.id)), ...fetchedTitles };
};

export const forgetEpisodeTitles = () => titlePageRequests.clear();
