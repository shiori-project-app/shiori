import { useEffect, useRef, useState } from 'react';

export const useIdle = (idleAfterMs) => {
  const [isIdle, setIsIdle] = useState(false);
  const idleTimer = useRef(0);

  const markActive = () => {
    setIsIdle(false);
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setIsIdle(true), idleAfterMs);
  };

  useEffect(() => () => clearTimeout(idleTimer.current), []);

  return [isIdle, markActive];
};
