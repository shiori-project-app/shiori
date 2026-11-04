const MIN_VARIANT_LENGTH = 3;

export const displayTitle = (series, language = 'english') => {
  const romajiTitle = series.romajiTitle || series.title;

  if (language === 'native') return series.nativeTitle || romajiTitle;
  if (language === 'romaji') return romajiTitle;

  return series.englishTitle || romajiTitle;
};

export const otherTitles = (series, language = 'english') => {
  const shownTitle = displayTitle(series, language);

  return [series.nativeTitle, series.englishTitle, series.romajiTitle].filter(
    (title, index, allTitles) => title && title !== shownTitle && allTitles.indexOf(title) === index,
  );
};

export const normalizeTitle = (title) => title.toLowerCase().replace(/[^a-z0-9]/g, '');

export const straightQuotes = (title) => title.replace(/[‘’]/g, "'").replace(/[“”]/g, '"');

export const looseTitle = (title) => normalizeTitle(title.replace(/&/g, ' and ').replace(/\bthe\b/gi, ' '));

const ORDINAL_WORDS = 'first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth';
const ORDINAL_VALUES = Object.fromEntries(ORDINAL_WORDS.split('|').map((word, index) => [word, index + 1]));

const PART_MARKER = 'part \\d+(?:\\s*(?:&|and)\\s*\\d+)?';
const PART_SUFFIX = new RegExp(`[\\s:-]*${PART_MARKER}[\\s-]*$`, 'i');

const SEASON_SUFFIX = new RegExp(
  `[\\s:-]*(season \\d+|\\d+(st|nd|rd|th) season|(${ORDINAL_WORDS}) season|${PART_MARKER}|s\\d+)[\\s-]*$`,
  'i',
);

const ROMAN_NUMERAL_SEASON =
  /(?<!\b(?:[Aa]ct|[Pp]art|[Vv]ol|[Cc]hapter))\s(II|III|IV|V|VI|VII|VIII|IX|X)(?=\s*(?::|$))/;

const ROMAN_NUMERAL_VALUES = { II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 };

const SEASON_IN_TITLE = new RegExp(
  `season (\\d+)|(\\d+)(?:st|nd|rd|th) season|\\bs(\\d+)(?:\\b|(?=e\\d))|\\b(${ORDINAL_WORDS}) season`,
  'i',
);

const withoutSeasonSuffixes = (title) =>
  SEASON_SUFFIX.test(title) ? withoutSeasonSuffixes(title.replace(SEASON_SUFFIX, '')) : title;

export const withoutSeason = (title) => withoutSeasonSuffixes(title.replace(ROMAN_NUMERAL_SEASON, ''));

export const markedSeason = (title) => {
  const match = SEASON_IN_TITLE.exec(title);

  if (match?.[4]) return ORDINAL_VALUES[match[4].toLowerCase()];
  if (match) return Number(match.slice(1, 4).find(Boolean));

  return ROMAN_NUMERAL_VALUES[ROMAN_NUMERAL_SEASON.exec(title)?.[1]] ?? null;
};

export const seasonNumber = (title) => markedSeason(title) ?? 1;

export const seriesTitles = (series) => [
  ...new Set([series.romajiTitle, series.title].filter(Boolean).map(straightQuotes)),
];

export const seriesSeason = (series) => Math.max(1, ...seriesTitles(series).map(seasonNumber));

const wholeSeasonVariants = (titles) =>
  titles
    .map((title) => ({ title, wholeSeason: title.replace(PART_SUFFIX, '').trim() }))
    .filter(({ title, wholeSeason }) => wholeSeason !== title && wholeSeason.length >= MIN_VARIANT_LENGTH)
    .map(({ wholeSeason }) => wholeSeason);

const numberedSeasonVariants = (titles, season) =>
  season > 1
    ? titles
        .map((title) => ({ title, baseTitle: withoutSeason(title) }))
        .filter(({ title, baseTitle }) => baseTitle !== title)
        .map(({ baseTitle }) => `${baseTitle} S${season}`)
    : [];

const shortNameVariants = (titles, season) =>
  titles
    .map((title) => ({ title, shortName: withoutSeason(title.split(':')[0]).trim() }))
    .filter(({ title, shortName }) => shortName.length >= MIN_VARIANT_LENGTH && shortName !== title)
    .map(({ shortName }) => (season > 1 ? `${shortName} S${season}` : shortName));

export const releaseTitleVariants = (series) => {
  const titles = seriesTitles(series);
  const season = seriesSeason(series);

  return [
    ...new Set([
      ...titles,
      ...(series.synonyms ?? []).map(straightQuotes),
      ...wholeSeasonVariants(titles),
      ...numberedSeasonVariants(titles, season),
      ...shortNameVariants(titles, season),
    ]),
  ];
};
