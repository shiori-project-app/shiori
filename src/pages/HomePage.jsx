import { useMemo } from 'react';
import { fetchAiringTrending } from '@/api/services/animeService';
import { EpisodeCard } from '@/components/anime/EpisodeCard';
import { HeroCarousel } from '@/components/anime/HeroCarousel';
import { Section } from '@/components/anime/Section';
import { Deferred } from '@/components/common/Deferred';
import { LoadError } from '@/components/common/LoadError';
import { OfflineNotice } from '@/components/common/OfflineNotice';
import { HeroSkeleton, SkeletonGrid } from '@/components/common/Skeleton';
import { HomeLists } from '@/components/home/HomeLists';
import { HomeListsSkeleton, ScheduleSkeleton } from '@/components/home/HomeSkeletons';
import { Schedule } from '@/components/home/Schedule';
import { Footer } from '@/components/layout/Footer';
import { HERO_SLIDES } from '@/config/app.config';
import { useAsync } from '@/hooks/useAsync';
import { useHistoryEntries } from '@/hooks/useHistoryEntries';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useContentFilter } from '@/hooks/usePreferences';
import { uniqueBy } from '@/utils/arrays';
import { buildEpisode } from '@/utils/episodes';

const CONTINUE_WATCHING_LIMIT = 10;
const LATEST_EPISODES_LIMIT = 12;
const LOADING_CARD_COUNT = 6;

const latestEntryPerSeries = (entries) => uniqueBy(entries, ({ series }) => series.id);

const heroSlides = (trendingSeries) => {
  const seriesWithBanner = trendingSeries.filter((series) => series.banner).slice(0, HERO_SLIDES);

  return seriesWithBanner.length ? seriesWithBanner : trendingSeries.slice(0, HERO_SLIDES);
};

const HomeLoading = () => (
  <>
    <HeroSkeleton />

    <section className="section">
      <SkeletonGrid count={LOADING_CARD_COUNT} />
    </section>
  </>
);

const ContinueWatching = ({ historyEntries }) => {
  const entries = useMemo(
    () => latestEntryPerSeries(historyEntries).slice(0, CONTINUE_WATCHING_LIMIT),
    [historyEntries],
  );

  if (!entries.length) return null;

  return (
    <Section title="Continue Watching" rail>
      {entries.map(({ series, episode }) => (
        <EpisodeCard key={episode.id} series={series} episode={episode} showProgress />
      ))}
    </Section>
  );
};

const LatestEpisodes = ({ trendingSeries }) => {
  const latestEpisodes = useMemo(
    () =>
      trendingSeries
        .slice(0, LATEST_EPISODES_LIMIT)
        .map((series) => ({ series, episode: buildEpisode(series, series.released) })),
    [trendingSeries],
  );

  return (
    <Section title="Latest Episodes" rail>
      {latestEpisodes.map(({ series, episode }) => (
        <EpisodeCard key={series.id} series={series} episode={episode} />
      ))}
    </Section>
  );
};

const OfflineHome = ({ history }) => (
  <>
    {history.loading ? <HomeLoading /> : <ContinueWatching historyEntries={history.entries} />}
    <OfflineNotice>Trending, new episodes and the airing schedule need a connection to AniList.</OfflineNotice>
    <Footer />
  </>
);

export const HomePage = () => {
  const contentFilter = useContentFilter();
  const isOnline = useOnlineStatus();
  const trending = useAsync(() => fetchAiringTrending(contentFilter), [contentFilter, isOnline]);
  const history = useHistoryEntries();

  if (!isOnline) return <OfflineHome history={history} />;

  const error = trending.error || history.error;

  const retryAll = () => {
    trending.retry();
    history.retry();
  };

  if (error) return <LoadError error={error} onRetry={retryAll} />;
  if (trending.loading || history.loading) return <HomeLoading />;

  const slides = heroSlides(trending.data);

  return (
    <>
      {slides.length > 0 && <HeroCarousel items={slides} />}
      <ContinueWatching historyEntries={history.entries} />
      <LatestEpisodes trendingSeries={trending.data} />

      <Deferred fallback={<HomeListsSkeleton />}>
        <HomeLists />
      </Deferred>

      <Deferred fallback={<ScheduleSkeleton />}>
        <Schedule />
      </Deferred>

      <Footer />
    </>
  );
};
