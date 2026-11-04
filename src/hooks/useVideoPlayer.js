import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PLAYBACK_RATES } from '@/config/app.config';
import { usePersistentState } from '@/hooks/usePersistentState';
import { createSeekCoalescer } from '@/utils/seekCoalescer';

const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));

const nextPlaybackRate = (rate) => PLAYBACK_RATES[(PLAYBACK_RATES.indexOf(rate) + 1) % PLAYBACK_RATES.length];

const ignorePlaybackRejection = () => {};

const useVideoEvents = (
  videoRef,
  startAt,
  seekCoalescer,
  { setTime, setDuration, setPlaying, setWaiting, setEnded, setError },
) => {
  const timeRef = useRef(startAt);
  const durationRef = useRef(0);

  useEffect(() => {
    const video = videoRef.current;

    const handlers = {
      loadedmetadata: () => {
        durationRef.current = video.duration;
        setDuration(video.duration);

        if (startAt > 0 && startAt < video.duration) video.currentTime = startAt;
      },

      timeupdate: () => {
        if (seekCoalescer.hasWaitingSeek()) return;

        timeRef.current = video.currentTime;
        setTime(video.currentTime);
      },

      play: () => {
        setPlaying(true);
        setEnded(false);
      },

      pause: () => setPlaying(false),
      waiting: () => setWaiting(true),
      canplay: () => setWaiting(false),
      playing: () => setWaiting(false),

      ended: () => {
        setPlaying(false);
        setEnded(true);
      },

      error: () => setError(video.error),
      seeked: seekCoalescer.applyWaitingSeek,
      emptied: seekCoalescer.forgetWaitingSeek,
    };

    const handlerEntries = Object.entries(handlers);

    handlerEntries.forEach(([eventName, handler]) => video.addEventListener(eventName, handler));

    return () => handlerEntries.forEach(([eventName, handler]) => video.removeEventListener(eventName, handler));
  }, [videoRef, startAt, seekCoalescer, setTime, setDuration, setPlaying, setWaiting, setEnded, setError]);

  return { timeRef, durationRef };
};

export const useVideoPlayer = (videoRef, startAt = 0) => {
  const [time, setTime] = useState(startAt);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [waiting, setWaiting] = useState(true);
  const [ended, setEnded] = useState(false);
  const [rate, setRate] = useState(1);
  const [error, setError] = useState(null);
  const [sound, setSound] = usePersistentState('player-volume', { volume: 1, muted: false });
  const [seekCoalescer] = useState(() => createSeekCoalescer(() => videoRef.current));

  const { timeRef, durationRef } = useVideoEvents(videoRef, startAt, seekCoalescer, {
    setTime,
    setDuration,
    setPlaying,
    setWaiting,
    setEnded,
    setError,
  });

  useEffect(() => {
    const video = videoRef.current;

    video.volume = sound.volume;
    video.muted = sound.muted;
  }, [videoRef, sound]);

  useEffect(() => {
    videoRef.current.playbackRate = rate;
  }, [videoRef, rate]);

  const seek = useCallback(
    (seconds) => {
      const targetTime = clamp(seconds, 0, durationRef.current || 0);

      seekCoalescer.seekTo(targetTime);
      timeRef.current = targetTime;
      setTime(targetTime);
      setEnded(false);
    },
    [seekCoalescer, timeRef, durationRef],
  );

  const play = useCallback(() => videoRef.current.play().catch(ignorePlaybackRejection), [videoRef]);

  const pause = useCallback(() => videoRef.current.pause(), [videoRef]);

  const toggle = useCallback(() => (videoRef.current.paused ? play() : pause()), [videoRef, play, pause]);

  const cycleRate = useCallback(() => setRate(nextPlaybackRate), []);

  const setVolume = useCallback((volume) => setSound({ volume: clamp(volume, 0, 1), muted: volume <= 0 }), [setSound]);

  const toggleMute = useCallback(() => setSound((current) => ({ ...current, muted: !current.muted })), [setSound]);

  const player = useMemo(
    () => ({
      duration,
      playing,
      waiting,
      ended,
      rate,
      error,
      volume: sound.volume,
      muted: sound.muted,
      timeRef,
      durationRef,
      seek,
      play,
      pause,
      toggle,
      cycleRate,
      setVolume,
      toggleMute,
    }),
    [
      duration,
      playing,
      waiting,
      ended,
      rate,
      error,
      sound,
      timeRef,
      durationRef,
      seek,
      play,
      pause,
      toggle,
      cycleRate,
      setVolume,
      toggleMute,
    ],
  );

  return { time, player };
};
