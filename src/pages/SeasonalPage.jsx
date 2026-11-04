import { SeasonCard } from '@/components/anime/SeasonCard';
import { EmptyState } from '@/components/common/EmptyState';
import { Icon } from '@/components/common/Icon';
import { LoadError } from '@/components/common/LoadError';
import { Pager } from '@/components/common/Pager';
import { Select } from '@/components/common/Select';
import { Tabs } from '@/components/common/Tabs';
import { Footer } from '@/components/layout/Footer';
import { useSeasonalChart } from '@/hooks/useSeasonalChart';
import { seasonLabel, shiftSeason } from '@/utils/season';
import { SEASONAL_SORT_OPTIONS } from '@/utils/seasonalChart';

const LOADING_CARD_COUNT = 6;

const SeasonNavigator = ({ selectedSeason, thisSeason, isCurrentSeason, onGoToSeason }) => (
  <div className="seasonal__head">
    <button
      type="button"
      className="section__arrow"
      aria-label="Previous season"
      onClick={() => onGoToSeason(shiftSeason(selectedSeason, -1))}
    >
      <Icon name="left" />
    </button>

    <h1 className="page-title seasonal__title">{seasonLabel(selectedSeason)}</h1>

    <button
      type="button"
      className="section__arrow"
      aria-label="Next season"
      onClick={() => onGoToSeason(shiftSeason(selectedSeason, 1))}
    >
      <Icon name="right" />
    </button>

    {!isCurrentSeason && (
      <button type="button" className="btn btn--ghost btn--sm" onClick={() => onGoToSeason(thisSeason)}>
        This season
      </button>
    )}
  </div>
);

const SeasonCardSkeletons = () => (
  <div className="seasonal__grid">
    {Array.from({ length: LOADING_CARD_COUNT }, (_, index) => (
      <div key={index} className="skeleton skeleton--season-card" />
    ))}
  </div>
);

const SeasonalList = ({ chart }) => {
  const { isContinuingTab, continuingSeries, isListLoading, visibleSeries, seriesOnPage, pageInfo, setPage } = chart;

  if (isContinuingTab && continuingSeries.error) {
    return <LoadError error={continuingSeries.error} onRetry={continuingSeries.retry} />;
  }

  if (isListLoading) return <SeasonCardSkeletons />;

  if (visibleSeries.length) {
    return (
      <>
        <div className="seasonal__grid">
          {seriesOnPage.map((series) => (
            <SeasonCard key={series.id} series={series} />
          ))}
        </div>

        <Pager pageInfo={pageInfo} onChange={setPage} />
      </>
    );
  }

  return isContinuingTab ? (
    <EmptyState title="Nothing continuing">No shows from earlier seasons were still running.</EmptyState>
  ) : (
    <EmptyState title="Nothing here yet">AniList has no titles listed for this season.</EmptyState>
  );
};

export const SeasonalPage = () => {
  const chart = useSeasonalChart();

  const { seasonSeries } = chart;

  if (seasonSeries.error) return <LoadError error={seasonSeries.error} onRetry={seasonSeries.retry} />;

  return (
    <>
      <SeasonNavigator
        selectedSeason={chart.selectedSeason}
        thisSeason={chart.thisSeason}
        isCurrentSeason={chart.isCurrentSeason}
        onGoToSeason={chart.goToSeason}
      />

      <div className="seasonal__bar">
        <Tabs tabs={chart.tabs} value={chart.activeTab} onChange={chart.selectTab} label="Format" />
        <Select srLabel="Sort" value={chart.sortId} onChange={chart.selectSort} options={SEASONAL_SORT_OPTIONS} />
      </div>

      <SeasonalList chart={chart} />
      {!seasonSeries.loading && <Footer />}
    </>
  );
};
