import { useCallback, useEffect, useRef } from 'react';
import { WATCHED_PROGRESS_RATIO } from '@/config/app.config';
import { exitFullscreen } from '@/hooks/useFullscreen';
import { useLibrary } from '@/hooks/useLibrary';
import { resumablePosition } from '@/utils/player';

export const PROGRESS_SAVE_INTERVAL_MS = 15000;

export const usePlaybackMilestones = ({ episodeId, player, time, onStarted, onWatched }) => {
  const { saveProgress } = useLibrary();

  const { playing, duration, ended, timeRef, durationRef } = player;

  const hasStarted = useRef(false);
  const hasBeenWatched = useRef(false);

  const saveCurrentPosition = useCallback(() => {
    if (durationRef.current) saveProgress(episodeId, resumablePosition(timeRef.current, durationRef.current));
  }, [episodeId, timeRef, durationRef, saveProgress]);

  useEffect(() => {
    if (!playing || hasStarted.current) return;

    hasStarted.current = true;
    onStarted?.();
  }, [playing, onStarted]);

  useEffect(() => {
    const reachedWatchedPoint = duration > 0 && (ended || time >= duration * WATCHED_PROGRESS_RATIO);

    if (hasBeenWatched.current || !reachedWatchedPoint) return;

    hasBeenWatched.current = true;
    onWatched?.();
  }, [time, duration, ended, onWatched]);

  useEffect(() => {
    if (!playing) return;

    const saveTimer = setInterval(saveCurrentPosition, PROGRESS_SAVE_INTERVAL_MS);

    return () => {
      clearInterval(saveTimer);
      saveCurrentPosition();
    };
  }, [playing, saveCurrentPosition]);

  useEffect(
    () => () => {
      saveCurrentPosition();
      exitFullscreen();
    },
    [saveCurrentPosition],
  );
};
