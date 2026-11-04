export const ALL_FORMATS_TAB = 'ALL';
export const CONTINUING_TAB = 'CONTINUING';

const FORMAT_TABS = [
  { id: ALL_FORMATS_TAB, label: 'All', formats: null },
  { id: 'TV', label: 'TV', formats: ['TV'] },
  { id: 'ONA', label: 'ONA', formats: ['ONA'] },
  { id: 'TV_SHORT', label: 'Shorts', formats: ['TV_SHORT'] },
  { id: 'MOVIE', label: 'Movies', formats: ['MOVIE'] },
  { id: 'OVA', label: 'OVA', formats: ['OVA'] },
];

const SORTED_LAST = Number.MAX_SAFE_INTEGER;
const UNRATED = -1;

const SEASONAL_SORTS = {
  popularity: { label: 'Most popular', compare: null },
  score: { label: 'Highest rated', compare: (first, second) => (second.rating ?? UNRATED) - (first.rating ?? UNRATED) },

  airing: {
    label: 'Airing soonest',
    compare: (first, second) => (first.nextAiringAt ?? SORTED_LAST) - (second.nextAiringAt ?? SORTED_LAST),
  },

  start: { label: 'Start date', compare: (first, second) => first.releaseKey - second.releaseKey },
  title: { label: 'Title A–Z', compare: null },
};

export const SEASONAL_SORT_OPTIONS = Object.entries(SEASONAL_SORTS).map(([sortId, { label }]) => [sortId, label]);

const matchesFormats = (formats) => (series) => !formats || formats.includes(series.format);

export const seriesInFormatTab = (seasonSeries, tabId) =>
  seasonSeries.filter(matchesFormats(FORMAT_TABS.find((tab) => tab.id === tabId)?.formats));

export const formatTabsWithCounts = (seasonSeries) => {
  if (!seasonSeries) return FORMAT_TABS;

  return FORMAT_TABS.map((tab) => ({ ...tab, hint: seasonSeries.filter(matchesFormats(tab.formats)).length })).filter(
    (tab) => tab.id === ALL_FORMATS_TAB || tab.hint > 0,
  );
};

export const sortSeasonalSeries = (seriesList, sortId, displayTitle) => {
  if (sortId === 'title') {
    return [...seriesList].sort((first, second) => displayTitle(first).localeCompare(displayTitle(second)));
  }

  const compare = SEASONAL_SORTS[sortId].compare;

  return compare ? [...seriesList].sort(compare) : seriesList;
};
