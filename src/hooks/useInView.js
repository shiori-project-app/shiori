import { useEffect, useRef, useState } from 'react';
import { DEFERRED_SECTION_PRELOAD_MARGIN } from '@/config/app.config';

export const useInView = (rootMargin = DEFERRED_SECTION_PRELOAD_MARGIN) => {
  const elementRef = useRef(null);
  const [hasBeenNearViewport, setHasBeenNearViewport] = useState(false);

  useEffect(() => {
    if (hasBeenNearViewport) return;

    const observer = new IntersectionObserver(([entry]) => entry.isIntersecting && setHasBeenNearViewport(true), {
      rootMargin,
    });

    observer.observe(elementRef.current);

    return () => observer.disconnect();
  }, [hasBeenNearViewport, rootMargin]);

  return [elementRef, hasBeenNearViewport];
};
