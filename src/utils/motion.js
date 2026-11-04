const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const REDUCE_MOTION_ATTRIBUTE = 'data-reduce-motion';

export const systemPrefersReducedMotion = () => window.matchMedia(REDUCED_MOTION_QUERY).matches;

export const subscribeToSystemMotion = (onChange) => {
  const systemSetting = window.matchMedia(REDUCED_MOTION_QUERY);

  systemSetting.addEventListener('change', onChange);

  return () => systemSetting.removeEventListener('change', onChange);
};

export const applyReduceMotion = (isReduced) =>
  document.documentElement.toggleAttribute(REDUCE_MOTION_ATTRIBUTE, Boolean(isReduced));

const scrollBehavior = () =>
  document.documentElement.hasAttribute(REDUCE_MOTION_ATTRIBUTE) || systemPrefersReducedMotion() ? 'auto' : 'smooth';

export const scrollByWidthFraction = (element, fraction, direction) =>
  element.scrollBy({ left: element.clientWidth * fraction * direction, behavior: scrollBehavior() });
