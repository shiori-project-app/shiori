import { ScrollRow } from '@/components/common/ScrollRow';
import { Select } from '@/components/common/Select';
import {
  DEFAULT_BROWSE_PARAMS,
  FIRST_YEAR,
  FORMAT_OPTIONS,
  GENRES,
  SEARCH_SORT,
  SEASON_OPTIONS,
  SORT_OPTIONS,
  STATUS_OPTIONS,
} from '@/constants/filters';
import { usePreferences } from '@/hooks/usePreferences';
import { cx } from '@/utils/classNames';
import { visibleGenres } from '@/utils/contentFilter';

const FILTER_KEYS = ['genre', 'sort', 'format', 'status', 'season', 'year'];
const YEARS_AHEAD_FOR_UPCOMING = 2;

const yearOptions = () => {
  const latestYear = new Date().getFullYear() + YEARS_AHEAD_FOR_UPCOMING;
  const years = Array.from({ length: latestYear - FIRST_YEAR + 1 }, (_, offset) => latestYear - offset);

  return [[0, 'All years'], ...years.map((year) => [year, year])];
};

const filterSelects = (sortOptions) => [
  { key: 'sort', label: 'Sort', options: sortOptions },
  { key: 'format', label: 'Format', options: FORMAT_OPTIONS },
  { key: 'status', label: 'Status', options: STATUS_OPTIONS },
  { key: 'season', label: 'Season', options: SEASON_OPTIONS },
  { key: 'year', label: 'Year', options: yearOptions() },
];

const GenreChips = ({ selectedGenre, onSelect }) => {
  const { hideEcchi } = usePreferences();

  return (
    <ScrollRow className="chips" role="group" aria-label="Genres">
      {visibleGenres(GENRES, hideEcchi).map((genre) => (
        <button
          key={genre}
          type="button"
          className={cx('chip', genre === selectedGenre && 'is-active')}
          onClick={() => onSelect(genre)}
        >
          {genre}
        </button>
      ))}
    </ScrollRow>
  );
};

export const BrowseFilters = ({ filters, defaults = DEFAULT_BROWSE_PARAMS, onChange }) => {
  const sortOptions = defaults.sort === SEARCH_SORT[0] ? [SEARCH_SORT, ...SORT_OPTIONS] : SORT_OPTIONS;
  const hasChangedFilters = FILTER_KEYS.some((key) => filters[key] !== defaults[key]);

  const resetFilters = () => onChange(Object.fromEntries(FILTER_KEYS.map((key) => [key, defaults[key]])));

  return (
    <>
      <GenreChips selectedGenre={filters.genre} onSelect={(genre) => onChange({ genre })} />

      <div className="filters">
        {filterSelects(sortOptions).map(({ key, label, options }) => (
          <Select
            key={key}
            srLabel={label}
            value={filters[key]}
            options={options}
            onChange={(value) => onChange({ [key]: value })}
          />
        ))}

        {hasChangedFilters && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={resetFilters}>
            Reset filters
          </button>
        )}
      </div>
    </>
  );
};
