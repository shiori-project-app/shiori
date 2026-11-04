import { hasDesktopBridge, readAniListResponse, saveAniListResponse } from '@/api/clients/desktopClient';
import { ANILIST_API_URL } from '@/config/api.config';
import { rememberRequest } from '@/utils/async';
import { fetchWithTimeout } from '@/utils/http';
import { retryDelayMilliseconds, serverAllowance } from '@/utils/rateLimitHeaders';
import { createRateLimitedQueue } from '@/utils/rateLimitedQueue';

const TOO_MANY_REQUESTS = 429;
const DEFAULT_RETRY_AFTER_SECONDS = 5;
const MAX_RETRY_AFTER_SECONDS = 60;
const MILLISECONDS_PER_SECOND = 1000;

const anilistRequestQueue = createRateLimitedQueue({
  burstSize: 20,
  refillPerSecond: 1.4,
  maxConcurrent: 4,
  backgroundReserve: 12,
});

const responseCache = new Map();
const rememberedAtByKey = new Map();
const responsesWithErrors = new WeakSet();

const ignoreSaveFailure = () => {};

const postQuery = (query, variables) =>
  fetchWithTimeout(ANILIST_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query, variables }),
  });

const readData = async (response) => {
  const json = await response.json().catch(() => null);

  if (!json || (json.errors && !json.data)) {
    throw new Error(json?.errors?.[0]?.message || 'AniList returned an unexpected response.');
  }

  if (json.errors) responsesWithErrors.add(json.data);

  return json.data;
};

const followServerRateLimit = (response) => {
  const allowance = serverAllowance(response.headers);

  if (allowance) anilistRequestQueue.matchServerAllowance(allowance);
};

const sendQuery = async (query, variables, queueOptions, isRetry = false) => {
  const response = await anilistRequestQueue.schedule(() => postQuery(query, variables), queueOptions);

  followServerRateLimit(response);

  if (response.status !== TOO_MANY_REQUESTS) return readData(response);

  const waitMilliseconds = retryDelayMilliseconds(response.headers, DEFAULT_RETRY_AFTER_SECONDS);

  if (isRetry || waitMilliseconds > MAX_RETRY_AFTER_SECONDS * MILLISECONDS_PER_SECOND) {
    throw new Error('AniList is rate-limiting requests. Wait a minute and retry.');
  }

  anilistRequestQueue.pauseFor(waitMilliseconds);

  return sendQuery(query, variables, queueOptions, true);
};

export const waitForAniListBackgroundTurn = () => anilistRequestQueue.schedule(() => {}, { background: true });

const readSavedResponse = (key) => (hasDesktopBridge() ? readAniListResponse(key).catch(() => null) : null);

const isFreshEnough = ({ savedAt }, keepForMs, now) => now >= savedAt && now - savedAt < keepForMs;

const saveResponse = (key, data) => {
  if (hasDesktopBridge()) saveAniListResponse(key, data).catch(ignoreSaveFailure);
};

const forgetResponse = (key) => {
  responseCache.delete(key);
  rememberedAtByKey.delete(key);
};

const forgetIfExpired = (key, keepForMs, now) => {
  if (keepForMs && now - (rememberedAtByKey.get(key) ?? now) >= keepForMs) forgetResponse(key);
};

const requestWithSavedResponse = async (key, keepForMs, requestFresh) => {
  const saved = await readSavedResponse(key);

  if (saved && isFreshEnough(saved, keepForMs, Date.now())) return saved.data;

  try {
    const data = await requestFresh();

    if (responsesWithErrors.has(data)) {
      forgetResponse(key);

      return saved ? saved.data : data;
    }

    saveResponse(key, data);

    return data;
  } catch (error) {
    if (!saved) throw error;

    forgetResponse(key);

    return saved.data;
  }
};

export const anilistQuery = (query, variables = {}, { cache: useCache = true, background = false, keepForMs } = {}) => {
  const requestFresh = () => sendQuery(query, variables, { background });

  if (!useCache) return requestFresh();

  const key = query + JSON.stringify(variables);
  const now = Date.now();

  forgetIfExpired(key, keepForMs, now);

  if (!responseCache.has(key)) rememberedAtByKey.set(key, now);

  return rememberRequest(responseCache, key, () =>
    keepForMs ? requestWithSavedResponse(key, keepForMs, requestFresh) : requestFresh(),
  );
};

export const forgetAniListResponses = () => {
  responseCache.clear();
  rememberedAtByKey.clear();
};
