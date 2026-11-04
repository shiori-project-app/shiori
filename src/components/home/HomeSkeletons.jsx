import { SkeletonGrid } from '@/components/common/Skeleton';

const DISCOVER_SKELETON_CARDS = 12;
const MINI_LIST_COUNT = 4;

export const HomeListsSkeleton = () => (
  <>
    <div className="home-split">
      <section className="section">
        <SkeletonGrid count={DISCOVER_SKELETON_CARDS} />
      </section>

      <div className="skeleton skeleton--panel" />
    </div>

    <div className="home-lists">
      {Array.from({ length: MINI_LIST_COUNT }, (_, index) => (
        <div key={index} className="skeleton skeleton--mini-list" />
      ))}
    </div>
  </>
);

export const ScheduleSkeleton = () => (
  <section className="section">
    <div className="skeleton skeleton--schedule" />
  </section>
);
