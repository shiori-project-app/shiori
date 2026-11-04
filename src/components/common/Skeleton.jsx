export const SkeletonGrid = ({ count }) => (
  <div className="poster-grid">
    {Array.from({ length: count }, (_, index) => (
      <div key={index} className="skeleton" />
    ))}
  </div>
);

export const HeroSkeleton = () => <div className="skeleton skeleton--hero" />;
