const RATE_SAFETY_MARGIN = 0.9;
const SECONDS_PER_MINUTE = 60;
const MILLISECONDS_PER_SECOND = 1000;

const numericHeader = (headers, name) => {
  const text = headers.get(name);

  if (text === null || text === '') return null;

  const value = Number(text);

  return Number.isFinite(value) ? value : null;
};

export const serverAllowance = (headers) => {
  const requestsPerMinute = numericHeader(headers, 'X-RateLimit-Limit');
  const remaining = numericHeader(headers, 'X-RateLimit-Remaining');

  if (!requestsPerMinute || remaining === null) return null;

  return { refillPerSecond: (requestsPerMinute * RATE_SAFETY_MARGIN) / SECONDS_PER_MINUTE, remaining };
};

export const retryDelayMilliseconds = (headers, fallbackSeconds, now = Date.now()) => {
  const retryAfterSeconds = numericHeader(headers, 'Retry-After');

  if (retryAfterSeconds > 0) return retryAfterSeconds * MILLISECONDS_PER_SECOND;

  const resetsAtSeconds = numericHeader(headers, 'X-RateLimit-Reset');
  const millisecondsUntilReset = resetsAtSeconds ? resetsAtSeconds * MILLISECONDS_PER_SECOND - now : 0;

  return millisecondsUntilReset > 0 ? millisecondsUntilReset : fallbackSeconds * MILLISECONDS_PER_SECOND;
};
