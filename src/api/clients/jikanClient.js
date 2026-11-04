import { JIKAN_API_URL } from '@/config/api.config';
import { sleep } from '@/utils/async';
import { fetchWithTimeout } from '@/utils/http';

const TOO_MANY_REQUESTS = 429;
const RATE_LIMIT_PAUSE_MS = 1300;

export const jikanGet = async (path, isRetry = false) => {
  const response = await fetchWithTimeout(JIKAN_API_URL + path, { headers: { Accept: 'application/json' } });

  if (response.status === TOO_MANY_REQUESTS && !isRetry) {
    await sleep(RATE_LIMIT_PAUSE_MS);

    return jikanGet(path, true);
  }

  if (!response.ok) throw new Error(`Jikan responded with ${response.status}`);

  return response.json();
};
