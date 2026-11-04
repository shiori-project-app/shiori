import { useInView } from '@/hooks/useInView';

export const Deferred = ({ fallback, children }) => {
  const [placeholderRef, isNearViewport] = useInView();

  return isNearViewport ? children : <div ref={placeholderRef}>{fallback}</div>;
};
