const MILLISECONDS_PER_SECOND = 1000;
export const DAYS_PER_WEEK = 7;

export const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

export const localMidnight = (daysFromToday) => {
  const now = new Date();

  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysFromToday);
};

export const toUnixSeconds = (date) => date.getTime() / MILLISECONDS_PER_SECOND;

export const nowInUnixSeconds = () => Date.now() / MILLISECONDS_PER_SECOND;

export const firstDayOfWeek = (daysFromToday) => Math.floor(daysFromToday / DAYS_PER_WEEK) * DAYS_PER_WEEK;

export const formatAiringTime = (unixSeconds) =>
  new Date(unixSeconds * MILLISECONDS_PER_SECOND).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export const airingIsoTime = (unixSeconds) => new Date(unixSeconds * MILLISECONDS_PER_SECOND).toISOString();

export const weekdayLabel = (daysFromToday, date) =>
  daysFromToday === 0 ? 'Today' : date.toLocaleDateString([], { weekday: 'short' });

export const shortDateLabel = (date) => date.toLocaleDateString([], { month: 'short', day: 'numeric' });
