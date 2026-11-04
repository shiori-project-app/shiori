export const ROUTES = {
  home: '/',
  browse: '/browse',
  trending: '/trending',
  seasonal: '/seasonal',
  myList: '/my-list',
  history: '/history',
  downloads: '/downloads',
  settings: '/settings',
  results: '/results',
  series: '/anime/:id',
  watch: '/watch/:id/:ep',
};

export const NAV_ITEMS = [
  { to: ROUTES.home, label: 'Home' },
  { to: ROUTES.browse, label: 'Browse' },
  { to: ROUTES.trending, label: 'Trending' },
  { to: ROUTES.seasonal, label: 'Seasonal' },
  { to: ROUTES.myList, label: 'My List' },
  { to: ROUTES.history, label: 'History' },
  { to: ROUTES.downloads, label: 'Downloads' },
];

export const seriesPath = (seriesId) => `/anime/${seriesId}`;

export const watchPath = (seriesId, episodeNumber) => `/watch/${seriesId}/${episodeNumber}`;

export const PLAY_ON_OPEN = { playOnOpen: true };

export const resultsPath = (query) => `${ROUTES.results}?${new URLSearchParams({ q: query })}`;

export const browsePath = (params) => `${ROUTES.browse}?${new URLSearchParams(params)}`;
