import { useCallback, useEffect, useRef, useState } from 'react';

export const ANNOUNCEMENT_DELAY_MS = 100;

export const useLiveAnnouncement = () => {
  const [announcement, setAnnouncement] = useState('');
  const announceTimer = useRef(0);

  const announce = useCallback((message) => {
    clearTimeout(announceTimer.current);
    setAnnouncement('');
    announceTimer.current = setTimeout(() => setAnnouncement(message), ANNOUNCEMENT_DELAY_MS);
  }, []);

  const clearAnnouncement = useCallback(() => {
    clearTimeout(announceTimer.current);
    setAnnouncement('');
  }, []);

  useEffect(() => () => clearTimeout(announceTimer.current), []);

  return { announcement, announce, clearAnnouncement };
};
