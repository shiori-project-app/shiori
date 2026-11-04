export const ANILIST_API_URL = 'https://graphql.anilist.co';
export const JIKAN_API_URL = 'https://api.jikan.moe/v4';
export const ANISKIP_API_URL = 'https://api.aniskip.com/v2';

export const ANILIST_SITE_URL = 'https://anilist.co';
export const JIKAN_SITE_URL = 'https://jikan.moe';

export const PAGE_SIZE = 24;
export const ANILIST_EXACT_TOTAL_LIMIT = 5000;
export const ANILIST_MAX_IDS_PER_REQUEST = 50;

const HOUR_MS = 60 * 60 * 1000;

export const ANILIST_KEEP_FOR_MS = {
  lists: HOUR_MS,
  schedule: HOUR_MS,
  trends: 6 * HOUR_MS,
  airingSchedule: 6 * HOUR_MS,
  recommendations: 24 * HOUR_MS,
  franchise: 24 * HOUR_MS,
  relations: 24 * HOUR_MS,
};

export const JIKAN_EPISODES_PER_PAGE = 100;

export const MAL_URL = 'https://myanimelist.net';
export const MAL_LIST_PAGE_SIZE = 300;

export const NYAA_URL = 'https://nyaa.si';
export const SUBSPLEASE_URL = 'https://subsplease.org';
export const ANIMEHEAVEN_URL = 'https://animeheaven.me';

export const NYAA_TRACKERS = [
  'http://nyaa.tracker.wf:7777/announce',
  'udp://open.stealth.si:80/announce',
  'udp://tracker.opentrackr.org:1337/announce',
  'udp://exodus.desync.com:6969/announce',
  'udp://tracker.torrent.eu.org:451/announce',
];
