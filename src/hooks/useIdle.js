import { useEffect, useRef, useState } from 'react';

export const useIdle = (idleAfterMs) => {
  const [isIdle, setIsIdle] = useState(false);
  const idleTimer = useRef(0);

  const restartIdleTimer = () => {
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setIsIdle(true), idleAfterMs);
  };

  const markActive = () => {
    setIsIdle(false);
    restartIdleTimer();
  };

  useEffect(() => {
    restartIdleTimer();

    return () => clearTimeout(idleTimer.current);
  }, [idleAfterMs]);

  return [isIdle, markActive];
};
