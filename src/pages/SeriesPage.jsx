import { useParams } from 'react-router';
import { EpisodePanel } from '@/components/anime/EpisodePanel';
import { Section } from '@/components/anime/Section';
import { WatchOrder } from '@/components/anime/WatchOrder';
import { Backdrop } from '@/components/common/Backdrop';
import { Deferred } from '@/components/common/Deferred';
import { LoadError } from '@/components/common/LoadError';
import { HeroSkeleton } from '@/components/common/Skeleton';
import { Footer } from '@/components/layout/Footer';
import { Recommendations } from '@/components/series/Recommendations';
import { SeriesOverview } from '@/components/series/SeriesOverview';
import { useEpisodeAvailability } from '@/hooks/useEpisodeAvailability';
import { useResumeEpisode } from '@/hooks/useResumeEpisode';
import { useSeries } from '@/hooks/useSeries';
import { NotFound } from '@/pages/NotFound';
import { hasAired } from '@/utils/series';

const SeriesDetails = ({ series }) => {
  const { resumeEpisode, hasStarted } = useResumeEpisode(series);

  const isResumeEpisodeDownloaded = useEpisodeAvailability(series)(resumeEpisode).state === 'ready';

  return (
    <>
      <section className="series__hero">
        <Backdrop series={series} />

        <SeriesOverview
          series={series}
          resumeEpisode={resumeEpisode}
          hasStarted={hasStarted}
          isResumeEpisodeDownloaded={isResumeEpisodeDownloaded}
        />
      </section>

      <div className="series__split">
        {hasAired(series) && (
          <div className="series__main">
            <Section title="Episodes">
              <EpisodePanel series={series} defaultEpisode={resumeEpisode} />
            </Section>
          </div>
        )}

        <WatchOrder series={series} />
      </div>

      <Deferred>
        <Recommendations seriesId={series.id} />
      </Deferred>

      <Footer />
    </>
  );
};

export const SeriesPage = () => {
  const { id } = useParams();
  const { data: series, error, loading, retry } = useSeries(Number(id));

  if (error) return <LoadError error={error} onRetry={retry} />;
  if (loading) return <HeroSkeleton />;
  if (!series) return <NotFound />;

  return <SeriesDetails series={series} />;
};
