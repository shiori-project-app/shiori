const REQUEST_TIMEOUT_MS = 20000;

const isTimeout = (error) => error.name === 'TimeoutError';

export const fetchWithTimeout = (url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) =>
  fetch(url, { ...options, signal: AbortSignal.timeout(timeoutMs) }).catch((error) => {
    throw isTimeout(error) ? new Error(`${new URL(url).hostname} didn't respond in time`) : error;
  });
