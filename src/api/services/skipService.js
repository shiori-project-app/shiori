import { findSavedSkipTimes } from '@/api/services/offlineStore';
import { ANISKIP_API_URL } from '@/config/api.config';
import { rememberRequest } from '@/utils/async';
import { fetchWithTimeout } from '@/utils/http';
import { SKIP_TYPES } from '@/utils/skipTimes';

const NOT_FOUND = 404;
const NO_SKIP_TIMES = [];
const ANY_EPISODE_LENGTH = '0';

const skipTimeRequests = new Map();

const skipTimesUrl = (malId, episodeNumber) => {
  const params = new URLSearchParams([
    ...Object.keys(SKIP_TYPES).map((skipType) => ['types[]', skipType]),
    ['episodeLength', ANY_EPISODE_LENGTH],
  ]);

  return `${ANISKIP_API_URL}/skip-times/${malId}/${episodeNumber}?${params}`;
};

const readSkipTimes = async (response) => {
  if (response.status === NOT_FOUND) return NO_SKIP_TIMES;
  if (!response.ok) throw new Error(`AniSkip ${response.status}`);

  return (await response.json()).results ?? NO_SKIP_TIMES;
};

export const requestSkipTimes = (malId, episodeNumber) =>
  rememberRequest(skipTimeRequests, `${malId}:${episodeNumber}`, () =>
    fetchWithTimeout(skipTimesUrl(malId, episodeNumber)).then(readSkipTimes),
  );

export const fetchSkipTimes = (malId, episodeNumber) =>
  requestSkipTimes(malId, episodeNumber).catch(
    async () => (await findSavedSkipTimes(malId, episodeNumber)) ?? NO_SKIP_TIMES,
  );

export const forgetSkipTimes = () => skipTimeRequests.clear();
