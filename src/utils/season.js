const SEASONS = ['WINTER', 'SPRING', 'SUMMER', 'FALL'];

const SEASON_LABELS = { WINTER: 'Winter', SPRING: 'Spring', SUMMER: 'Summer', FALL: 'Fall' };
const SEASONS_PER_YEAR = SEASONS.length;
const MONTHS_PER_SEASON = 3;
const EARLIEST_SEASON_YEAR = 1940;
const LATEST_SEASON_YEAR = 2100;

const seasonIndex = ({ season, year }) => year * SEASONS_PER_YEAR + SEASONS.indexOf(season);

export const currentSeason = (date = new Date()) => ({
  season: SEASONS[Math.floor(date.getMonth() / MONTHS_PER_SEASON)],
  year: date.getFullYear(),
});

export const shiftSeason = (season, seasonsToShift) => {
  const shiftedIndex = seasonIndex(season) + seasonsToShift;

  return {
    season: SEASONS[((shiftedIndex % SEASONS_PER_YEAR) + SEASONS_PER_YEAR) % SEASONS_PER_YEAR],
    year: Math.floor(shiftedIndex / SEASONS_PER_YEAR),
  };
};

export const seasonLabel = ({ season, year }) => `${SEASON_LABELS[season]} ${year}`;

export const seasonStartDate = ({ season, year }) =>
  year * 10000 + (SEASONS.indexOf(season) * MONTHS_PER_SEASON + 1) * 100 + 1;

export const compareSeasons = (firstSeason, secondSeason) => seasonIndex(firstSeason) - seasonIndex(secondSeason);

const isValidSeasonYear = (year) => year >= EARLIEST_SEASON_YEAR && year <= LATEST_SEASON_YEAR;

export const readSeason = (searchParams, date = new Date()) => {
  const season = searchParams.get('season');
  const year = Number(searchParams.get('year'));

  return SEASONS.includes(season) && isValidSeasonYear(year) ? { season, year } : currentSeason(date);
};
