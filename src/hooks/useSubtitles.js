import { useEffect, useState } from 'react';
import ASS from 'assjs';
import { getSubtitles } from '@/api/clients/desktopClient';
import { useAsync } from '@/hooks/useAsync';
import { usePersistentState } from '@/hooks/usePersistentState';

const NOT_PICKED_YET = undefined;
const SUBTITLES_OFF = null;

const isStyledTrack = (track) => track.kind === 'ass';

const defaultTrack = (tracks, preference) => {
  if (preference.off || !tracks.length) return null;

  const tracksInPreferredLanguage = tracks.filter(
    (track) => preference.language && track.language === preference.language,
  );

  return (
    tracksInPreferredLanguage.find(isStyledTrack) ??
    tracksInPreferredLanguage[0] ??
    tracks.find(isStyledTrack) ??
    tracks[0]
  );
};

const renderStyledSubtitles = (track, video, overlay) => {
  const renderer = new ASS(track.ass, video, { container: overlay, resampling: 'video_height' });

  return () => renderer.destroy();
};

const renderPlainSubtitles = (track, video) => {
  const captions = video.addTextTrack('subtitles', track.name ?? '', track.language ?? '');

  track.cues.forEach((cue) => captions.addCue(new VTTCue(cue.start, cue.end, cue.text)));
  captions.mode = 'showing';

  return () => {
    [...(captions.cues ?? [])].forEach((cue) => captions.removeCue(cue));
    captions.mode = 'disabled';
  };
};

export const useSubtitles = (file, videoRef, overlayRef) => {
  const { data: loadedTracks, loading, error } = useAsync(() => getSubtitles(file.path), [file.path]);

  const tracks = loadedTracks ?? [];

  const [preference, setPreference] = usePersistentState('player-subtitles', { off: false, language: null });
  const [pickedTrackNumber, setPickedTrackNumber] = useState(NOT_PICKED_YET);

  const currentTrackNumber =
    pickedTrackNumber === NOT_PICKED_YET
      ? (defaultTrack(tracks, preference)?.number ?? SUBTITLES_OFF)
      : pickedTrackNumber;

  const selectTrack = (trackNumber) => {
    if (!tracks.length) return;

    setPickedTrackNumber(trackNumber);

    const track = tracks.find((candidate) => candidate.number === trackNumber);

    setPreference(track ? { off: false, language: track.language } : { ...preference, off: true });
  };

  const toggleSubtitles = () =>
    selectTrack(
      currentTrackNumber === SUBTITLES_OFF
        ? (defaultTrack(tracks, { ...preference, off: false })?.number ?? SUBTITLES_OFF)
        : SUBTITLES_OFF,
    );

  useEffect(() => {
    const track = loadedTracks?.find((candidate) => candidate.number === currentTrackNumber);

    if (!track) return;

    return isStyledTrack(track)
      ? renderStyledSubtitles(track, videoRef.current, overlayRef.current)
      : renderPlainSubtitles(track, videoRef.current);
  }, [loadedTracks, currentTrackNumber, videoRef, overlayRef]);

  return { tracks, current: currentTrackNumber, select: selectTrack, toggle: toggleSubtitles, loading, error };
};
