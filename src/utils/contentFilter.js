const ALWAYS_EXCLUDED_GENRES = ['Hentai'];
const ECCHI_GENRE = 'Ecchi';

export const NO_CONTENT_FILTER = { hideEcchi: false };

export const genresToExclude = (hideEcchi) =>
  hideEcchi ? [...ALWAYS_EXCLUDED_GENRES, ECCHI_GENRE] : ALWAYS_EXCLUDED_GENRES;

export const excludedGenres = (contentFilter = NO_CONTENT_FILTER) => genresToExclude(contentFilter.hideEcchi);

export const isFilteredOut = (series, contentFilter = NO_CONTENT_FILTER) => contentFilter.hideEcchi && series.isEcchi;

export const visibleGenres = (genres, hideEcchi) =>
  hideEcchi ? genres.filter((genre) => genre !== ECCHI_GENRE) : genres;
