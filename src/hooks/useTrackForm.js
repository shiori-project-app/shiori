import { useState } from 'react';
import { useAnimeHeavenShow } from '@/hooks/useAnimeHeavenShow';
import { useSubsPleaseShow } from '@/hooks/useSubsPleaseShow';
import { useTorrentPreferences } from '@/hooks/useTorrentPreferences';
import { useTracking } from '@/hooks/useTracking';
import { subsPleaseResolution } from '@/utils/subsPleaseReleases';

export const TRACKING_SOURCES = { animeHeaven: 'animeheaven', subsPlease: 'subsplease', nyaa: 'nyaa' };

const FIRST_EPISODE = 1;

const isAiringOrUpcoming = (series) => series.status === 'Airing' || series.status === 'Upcoming';

export const useTrackForm = (series) => {
  const { tracked, track, untrack } = useTracking();
  const [torrentDefaults] = useTorrentPreferences();

  const existingEntry = tracked[series.id];
  const isAiring = isAiringOrUpcoming(series);

  const firstNewEpisode = series.released + 1;

  const [source, setSource] = useState(existingEntry?.source ?? TRACKING_SOURCES.animeHeaven);
  const [resolution, setResolution] = useState(existingEntry?.resolution ?? torrentDefaults.resolution);
  const [audio, setAudio] = useState(existingEntry?.audio ?? torrentDefaults.audio);

  const [fromEpisode, setFromEpisode] = useState(
    existingEntry?.fromEpisode ?? (isAiring ? firstNewEpisode : FIRST_EPISODE),
  );

  const [isSaved, setIsSaved] = useState(false);

  const animeHeavenShow = useAnimeHeavenShow(series);

  const subsPleaseShow = useSubsPleaseShow(series, {
    initialShow: existingEntry?.spShow ?? null,
    enabled: source === TRACKING_SOURCES.subsPlease,
  });

  const subsPleaseQuality = subsPleaseResolution(resolution);

  const canSave =
    source === TRACKING_SOURCES.nyaa ||
    (source === TRACKING_SOURCES.animeHeaven && Boolean(animeHeavenShow.selectedShow)) ||
    (source === TRACKING_SOURCES.subsPlease && Boolean(subsPleaseShow.found.data));

  const saveTracking = () => {
    track(series, {
      source,
      resolution: source === TRACKING_SOURCES.subsPlease ? subsPleaseQuality : resolution,
      audio,
      fromEpisode,
      ahCode: animeHeavenShow.selectedShow?.code ?? existingEntry?.ahCode,
      ahTitle: animeHeavenShow.selectedShow?.title ?? existingEntry?.ahTitle,
      spShow: source === TRACKING_SOURCES.subsPlease ? subsPleaseShow.picked : existingEntry?.spShow,
    });

    setIsSaved(true);
  };

  const stopTracking = () => untrack(series.id);

  return {
    existingEntry,
    isAiring,
    firstNewEpisode,
    source,
    setSource,
    resolution,
    setResolution,
    subsPleaseQuality,
    audio,
    setAudio,
    fromEpisode,
    setFromEpisode,
    animeHeavenShow,
    subsPleaseShow,
    canSave,
    isSaved,
    saveTracking,
    stopTracking,
  };
};
