import { fetchRecommendations } from '@/api/services/animeService';
import { PosterCard } from '@/components/anime/PosterCard';
import { Section } from '@/components/anime/Section';
import { useAsync } from '@/hooks/useAsync';
import { useContentFilter } from '@/hooks/usePreferences';

export const Recommendations = ({ seriesId }) => {
  const contentFilter = useContentFilter();

  const { data: recommendations } = useAsync(
    () => fetchRecommendations(seriesId, contentFilter),
    [seriesId, contentFilter],
  );

  if (!recommendations?.length) return null;

  return (
    <Section title="You May Also Like" rail>
      {recommendations.map((recommendation) => (
        <PosterCard key={recommendation.id} series={recommendation} />
      ))}
    </Section>
  );
};
