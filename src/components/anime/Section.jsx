import { useRef } from 'react';
import { Link } from 'react-router';
import { Icon } from '@/components/common/Icon';
import { scrollByWidthFraction } from '@/utils/motion';

const RAIL_SCROLL_RATIO = 0.85;

const RailArrows = ({ onScroll }) => (
  <div className="section__arrows">
    <button type="button" className="section__arrow" aria-label="Scroll left" onClick={() => onScroll(-1)}>
      <Icon name="left" />
    </button>

    <button type="button" className="section__arrow" aria-label="Scroll right" onClick={() => onScroll(1)}>
      <Icon name="right" />
    </button>
  </div>
);

export const Section = ({ title, moreTo, rail = false, children }) => {
  const railRef = useRef(null);

  const scrollRail = (direction) => scrollByWidthFraction(railRef.current, RAIL_SCROLL_RATIO, direction);

  return (
    <section className="section">
      <div className="section__head">
        <h2 className="section__title">{title}</h2>

        {moreTo && (
          <Link className="section__more" to={moreTo}>
            View all
          </Link>
        )}

        {rail && <RailArrows onScroll={scrollRail} />}
      </div>

      {rail ? (
        <div className="rail" ref={railRef}>
          {children}
        </div>
      ) : (
        children
      )}
    </section>
  );
};
