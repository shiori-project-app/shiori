import { EmptyState } from '@/components/common/EmptyState';
import { LoadError } from '@/components/common/LoadError';
import { STATS_MONTH_COUNT } from '@/config/app.config';
import { useWatchStats } from '@/hooks/useWatchStats';
import { cx } from '@/utils/classNames';
import { formatHours, pluralize } from '@/utils/format';

const LOADING_TILE_COUNT = 3;

const shortMonthName = (milliseconds) => new Date(milliseconds).toLocaleString([], { month: 'short' });

const fullMonthName = (milliseconds) => new Date(milliseconds).toLocaleString([], { month: 'long', year: 'numeric' });

const shareOf = (value, largest) => `${largest ? (value / largest) * 100 : 0}%`;

const StatTile = ({ label, value, unit }) => (
  <div className="stat-tile">
    <span className="stat-tile__label">{label}</span>

    <span className="stat-tile__value">
      {value}
      {unit && <small>{unit}</small>}
    </span>
  </div>
);

const StatsPanel = ({ id, title, hint, children }) => (
  <section className="stats-panel" aria-labelledby={id}>
    <div className="stats-panel__head">
      <h2 className="stats-panel__title" id={id}>
        {title}
      </h2>

      {hint && <span className="stats-panel__hint">{hint}</span>}
    </div>

    {children}
  </section>
);

const GenreBars = ({ genres }) => {
  const largestShowCount = genres[0]?.showCount ?? 0;

  return (
    <ol className="genre-bars">
      {genres.map(({ genre, showCount }) => (
        <li key={genre} className="genre-bars__row">
          <span className="genre-bars__name">{genre}</span>

          <span className="genre-bars__track">
            <span className="genre-bars__bar" style={{ '--share': shareOf(showCount, largestShowCount) }} />
          </span>

          <span className="genre-bars__value">{pluralize(showCount, 'show')}</span>
        </li>
      ))}
    </ol>
  );
};

const MonthChart = ({ months }) => {
  const busiestMonthEpisodes = Math.max(0, ...months.map((month) => month.episodes));

  return (
    <ol className="month-chart">
      {months.map((month) => {
        const isBusiest = month.episodes > 0 && month.episodes === busiestMonthEpisodes;

        return (
          <li key={month.month} className={cx('month-chart__month', isBusiest && 'is-busiest')}>
            <span className="month-chart__plot" aria-hidden="true">
              <span className="month-chart__value">{month.episodes}</span>
              <span className="month-chart__bar" style={{ '--share': shareOf(month.episodes, busiestMonthEpisodes) }} />
            </span>

            <span className="month-chart__label" aria-hidden="true">
              {shortMonthName(month.startsAt)}
            </span>

            <span className="sr-only">
              {fullMonthName(month.startsAt)}: {pluralize(month.episodes, 'episode')}
            </span>
          </li>
        );
      })}
    </ol>
  );
};

const WatchStatsLoading = () => (
  <div className="watch-stats" aria-busy="true">
    <div className="watch-stats__tiles">
      {Array.from({ length: LOADING_TILE_COUNT }, (_, index) => (
        <div key={index} className="skeleton stat-tile__skeleton" />
      ))}
    </div>
  </div>
);

export const WatchStats = () => {
  const { stats, error, retry } = useWatchStats();

  if (error) return <LoadError error={error} onRetry={retry} />;
  if (!stats) return <WatchStatsLoading />;

  if (!stats.episodeCount) {
    return <EmptyState title="No stats yet">Episodes you finish or mark as watched add up here.</EmptyState>;
  }

  return (
    <div className="watch-stats">
      <div className="watch-stats__tiles">
        <StatTile label="Hours watched" value={formatHours(stats.secondsWatched)} unit="h" />
        <StatTile label="Episodes watched" value={stats.episodeCount.toLocaleString()} />
        <StatTile label="Shows watched" value={stats.showCount.toLocaleString()} />
      </div>

      <div className="watch-stats__panels">
        <StatsPanel id="stats-genres" title="Top genres" hint="By shows watched">
          <GenreBars genres={stats.genres} />
        </StatsPanel>

        <StatsPanel id="stats-months" title="Episodes per month" hint={`Last ${STATS_MONTH_COUNT} months`}>
          {stats.hasWatchDates ? (
            <MonthChart months={stats.months} />
          ) : (
            <p className="stats-panel__empty">
              Episodes you finish or mark as watched from now on show up here by month.
            </p>
          )}
        </StatsPanel>
      </div>
    </div>
  );
};
