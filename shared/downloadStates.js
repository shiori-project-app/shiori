const ACTIVE_STATES = ['queued', 'downloading'];
const RETRYABLE_STATES = ['failed', 'cancelled'];

export const isActive = (download) => ACTIVE_STATES.includes(download.state);

export const isPending = (download) => isActive(download) || download.state === 'paused';

export const isRetryable = (download) => RETRYABLE_STATES.includes(download.state);
