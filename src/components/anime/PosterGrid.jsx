import { PosterCard } from '@/components/anime/PosterCard';

export const PosterGrid = ({ items, rankFrom }) => (
  <div className="poster-grid">
    {items.map((series, index) => (
      <PosterCard key={series.id} series={series} rank={rankFrom ? rankFrom + index : undefined} />
    ))}
  </div>
);
