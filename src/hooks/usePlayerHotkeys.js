import { useEffect, useEffectEvent } from 'react';

const LONG_SEEK_SECONDS = 10;
const SHORT_SEEK_SECONDS = 5;
const VOLUME_STEP = 0.1;
const END_MARGIN_SECONDS = 0.1;
const DIGIT_KEY = /^[0-9]$/;

const hasModifierKey = (event) => event.ctrlKey || event.metaKey || event.altKey;

const keyHasNativeMeaning = (target, key) => {
  const tagName = target.tagName;

  if (tagName === 'SELECT' || (tagName === 'INPUT' && target.type !== 'range')) return true;
  if (tagName === 'BUTTON' && (key === ' ' || key === 'enter')) return true;
  if (tagName === 'A' && key === 'enter') return true;
  if (target.type === 'range' && key.startsWith('arrow')) return true;

  return Boolean(target.closest?.('[role="listbox"], .player__menu')) && key !== ' ';
};

const playerActionsByKey = (player) => {
  const seekBy = (seconds) => player.seek(player.timeRef.current + seconds);

  return {
    ' ': player.toggle,
    k: player.toggle,
    j: () => seekBy(-LONG_SEEK_SECONDS),
    l: () => seekBy(LONG_SEEK_SECONDS),
    arrowleft: () => seekBy(-SHORT_SEEK_SECONDS),
    arrowright: () => seekBy(SHORT_SEEK_SECONDS),
    arrowup: () => player.setVolume(player.volume + VOLUME_STEP),
    arrowdown: () => player.setVolume(player.volume - VOLUME_STEP),
    m: player.toggleMute,
    c: player.toggleSubtitles,
    s: player.skipSegment,
    f: player.toggleFullscreen,
    p: player.togglePictureInPicture,
    t: player.toggleTheater,
    home: () => player.seek(0),
    end: () => player.seek(player.duration - END_MARGIN_SECONDS),
  };
};

const seekToTenth = (player, digit) => player.seek((player.duration * Number(digit)) / 10);

export const usePlayerHotkeys = (player) => {
  const handleKeyDown = useEffectEvent((event) => {
    if (event.defaultPrevented || hasModifierKey(event)) return;

    const key = event.key.toLowerCase();

    if (keyHasNativeMeaning(event.target, key)) return;

    const action = DIGIT_KEY.test(key) ? () => seekToTenth(player, key) : playerActionsByKey(player)[key];

    if (!action) return;

    event.preventDefault();
    action();
  });

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
};
