import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useReducedMotion } from '@/hooks/usePreferences';

const subscribeToVisibility = (onChange) => {
  document.addEventListener('visibilitychange', onChange);

  return () => document.removeEventListener('visibilitychange', onChange);
};

const isPageVisible = () => document.visibilityState === 'visible';

export const useCarousel = (slideCount, intervalMs) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAutoAdvancing, setIsAutoAdvancing] = useState(slideCount > 1);
  const [isHovered, setIsHovered] = useState(false);
  const [hasKeyboardFocusWithin, setHasKeyboardFocusWithin] = useState(false);

  const focusedElement = useRef(null);

  const isVisible = useSyncExternalStore(subscribeToVisibility, isPageVisible);
  const isMotionReduced = useReducedMotion();

  const isRunning = isAutoAdvancing && !isMotionReduced && !isHovered && !hasKeyboardFocusWithin && isVisible;

  useEffect(() => {
    if (!isRunning) return;

    const timer = setInterval(() => setActiveIndex((index) => (index + 1) % slideCount), intervalMs);

    return () => clearInterval(timer);
  }, [isRunning, slideCount, intervalMs]);

  useEffect(() => {
    if (!hasKeyboardFocusWithin) return;

    const timer = setInterval(() => {
      if (!focusedElement.current?.isConnected) setHasKeyboardFocusWithin(false);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [hasKeyboardFocusWithin, intervalMs]);

  const showSlide = (index) => {
    setIsAutoAdvancing(false);
    setActiveIndex(index);
  };

  const pauseHandlers = {
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: () => setIsHovered(false),

    onFocus: (event) => {
      focusedElement.current = event.target;
      setHasKeyboardFocusWithin(event.target.matches(':focus-visible'));
    },

    onBlur: (event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setHasKeyboardFocusWithin(false);
    },
  };

  return { activeIndex, showSlide, pauseHandlers };
};
