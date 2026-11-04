import { useCallback, useEffect, useState } from 'react';
import { usePersistentState } from '@/hooks/usePersistentState';

const describeAudioTracks = (video) =>
  video.audioTracks
    ? [...video.audioTracks].map((track, index) => ({
        index,
        label: track.label,
        language: track.language,
        enabled: track.enabled,
      }))
    : [];

const switchToAudioTrack = (audioTracks, selectedIndex) => {
  audioTracks[selectedIndex].enabled = true;

  [...audioTracks].forEach((track, index) => {
    if (index !== selectedIndex) track.enabled = false;
  });
};

export const useAudioTracks = (videoRef) => {
  const [audioTracks, setAudioTracks] = useState([]);
  const [preferredLanguage, setPreferredLanguage] = usePersistentState('player-audio-language', null);

  const enableAudioTrack = useCallback(
    (index) => {
      const video = videoRef.current;

      if (!video.audioTracks) return;

      switchToAudioTrack(video.audioTracks, index);
      setAudioTracks(describeAudioTracks(video));
    },
    [videoRef],
  );

  useEffect(() => {
    const video = videoRef.current;

    const applyPreferredLanguage = () => {
      const foundTracks = describeAudioTracks(video);
      const preferredTrack = preferredLanguage && foundTracks.find((track) => track.language === preferredLanguage);

      if (preferredTrack && !preferredTrack.enabled) enableAudioTrack(preferredTrack.index);
      else setAudioTracks(foundTracks);
    };

    video.addEventListener('loadedmetadata', applyPreferredLanguage);

    return () => video.removeEventListener('loadedmetadata', applyPreferredLanguage);
  }, [videoRef, enableAudioTrack]);

  const selectAudioTrack = (index) => {
    enableAudioTrack(index);
    setPreferredLanguage(audioTracks[index]?.language || null);
  };

  return { tracks: audioTracks, select: selectAudioTrack };
};
