export const GENRES = [
  'All',
  'Action',
  'Adventure',
  'Comedy',
  'Drama',
  'Ecchi',
  'Fantasy',
  'Horror',
  'Mahou Shoujo',
  'Mecha',
  'Music',
  'Mystery',
  'Psychological',
  'Romance',
  'Sci-Fi',
  'Slice of Life',
  'Sports',
  'Supernatural',
  'Thriller',
];

export const SORT_OPTIONS = [
  ['TRENDING_DESC', 'Trending'],
  ['POPULARITY_DESC', 'Most popular'],
  ['SCORE_DESC', 'Highest rated'],
  ['START_DATE_DESC', 'Newest'],
  ['END_DATE_DESC', 'Recently finished'],
  ['TITLE_ROMAJI', 'Title A–Z'],
];

export const SEARCH_SORT = ['SEARCH_MATCH', 'Best match'];

export const DATE_SORTS = ['START_DATE_DESC', 'END_DATE_DESC'];
export const MIN_POPULARITY = 3000;

export const FORMAT_OPTIONS = [
  ['ANY', 'All formats'],
  ['TV', 'TV'],
  ['MOVIE', 'Movies'],
  ['OVA', 'OVA'],
  ['ONA', 'ONA / Web'],
];

export const STATUS_OPTIONS = [
  ['ANY', 'Any status'],
  ['RELEASING', 'Airing'],
  ['FINISHED', 'Finished'],
  ['NOT_YET_RELEASED', 'Upcoming'],
];

export const RELEASED_STATUSES = ['RELEASING', 'FINISHED', 'HIATUS', 'CANCELLED'];

export const SEASON_OPTIONS = [
  ['ANY', 'Any season'],
  ['WINTER', 'Winter'],
  ['SPRING', 'Spring'],
  ['SUMMER', 'Summer'],
  ['FALL', 'Fall'],
];

export const LIST_FORMATS = ['TV', 'TV_SHORT', 'MOVIE', 'OVA', 'ONA'];

export const FORMAT_LABELS = {
  TV: 'TV',
  TV_SHORT: 'TV Short',
  MOVIE: 'Movie',
  OVA: 'OVA',
  ONA: 'ONA',
  SPECIAL: 'Special',
};

export const FIRST_YEAR = 1990;

export const DEFAULT_BROWSE_PARAMS = {
  genre: 'All',
  sort: 'TRENDING_DESC',
  format: 'ANY',
  status: 'ANY',
  season: 'ANY',
  year: 0,
  page: 1,
};

export const DEFAULT_SEARCH_PARAMS = { ...DEFAULT_BROWSE_PARAMS, sort: 'SEARCH_MATCH' };
