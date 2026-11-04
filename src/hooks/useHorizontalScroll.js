import { useEffect, useRef, useState } from 'react';
import { scrollByWidthFraction } from '@/utils/motion';

const WHEEL_LINE_HEIGHT_PX = 40;
const PAGE_SCROLL_RATIO = 0.75;
const EDGE_TOLERANCE_PX = 1;

const isAtStart = (element) => element.scrollLeft <= EDGE_TOLERANCE_PX;

const isAtEnd = (element) => element.scrollLeft + element.clientWidth >= element.scrollWidth - EDGE_TOLERANCE_PX;

const DELTA_MODE_LINES = 1;
const DELTA_MODE_PAGES = 2;

const pixelsPerWheelUnit = (deltaMode, track) => {
  const pixelsByMode = {
    [DELTA_MODE_LINES]: WHEEL_LINE_HEIGHT_PX,
    [DELTA_MODE_PAGES]: track.clientWidth * PAGE_SCROLL_RATIO,
  };

  return pixelsByMode[deltaMode] ?? 1;
};

const wheelDistanceInPixels = (event, track) => event.deltaY * pixelsPerWheelUnit(event.deltaMode, track);

const isHorizontalGesture = (event) => Math.abs(event.deltaX) >= Math.abs(event.deltaY);

export const useHorizontalScroll = () => {
  const trackRef = useRef(null);
  const [hiddenContent, setHiddenContent] = useState({ before: false, after: false });

  useEffect(() => {
    const track = trackRef.current;

    const updateHiddenContent = () => setHiddenContent({ before: !isAtStart(track), after: !isAtEnd(track) });

    const scrollSidewaysOnVerticalWheel = (event) => {
      if (isHorizontalGesture(event)) return;

      const distance = wheelDistanceInPixels(event, track);
      const reachedEdge = distance > 0 ? isAtEnd(track) : isAtStart(track);

      if (reachedEdge) return;

      event.preventDefault();
      track.scrollLeft += distance;
    };

    updateHiddenContent();
    track.addEventListener('scroll', updateHiddenContent, { passive: true });
    track.addEventListener('wheel', scrollSidewaysOnVerticalWheel, { passive: false });

    const resizeObserver = new ResizeObserver(updateHiddenContent);

    resizeObserver.observe(track);

    return () => {
      track.removeEventListener('scroll', updateHiddenContent);
      track.removeEventListener('wheel', scrollSidewaysOnVerticalWheel);
      resizeObserver.disconnect();
    };
  }, []);

  const scrollByPage = (direction) => scrollByWidthFraction(trackRef.current, PAGE_SCROLL_RATIO, direction);

  return { trackRef, hiddenContent, scrollByPage };
};
