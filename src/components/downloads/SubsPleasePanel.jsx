import { memo, useCallback, useState } from 'react';
import { releaseMagnet } from '@/api/services/subsPleaseService';
import { ChoiceChips } from '@/components/downloads/ChoiceChips';
import { SubsPleaseShowPicker } from '@/components/downloads/SubsPleaseShowPicker';
import { TorrentAppHint } from '@/components/downloads/TorrentAppHint';
import { TorrentRow } from '@/components/downloads/TorrentRow';
import { SUBSPLEASE_RESOLUTION_OPTIONS, SUBSPLEASE_RESOLUTIONS } from '@/constants/torrents';
import { useSubsPleaseShow } from '@/hooks/useSubsPleaseShow';
import { useTorrentHandoff } from '@/hooks/useTorrentHandoff';
import { useTorrentPreferences } from '@/hooks/useTorrentPreferences';
import { releasesForEpisode, releasesForSeason, subsPleaseResolution } from '@/utils/subsPleaseReleases';

const releaseTitle = (release) =>
  `[SubsPlease] ${release.show} – ${release.isBatch ? `${release.label} (Batch)` : release.label}`;

const releaseEpisodesText = (release) =>
  release.isBatch ? `Episodes ${release.from}–${release.to}` : `Episode ${release.episodeNumber}`;

const availableResolutionsText = (release) =>
  SUBSPLEASE_RESOLUTIONS.filter((resolution) => release.magnets[resolution])
    .map((resolution) => `${resolution}p`)
    .join(' · ');

const SubsPleaseRelease = memo(({ release, resolution, onOpen, onCopy }) => (
  <TorrentRow
    title={releaseTitle(release)}
    onCopy={() => onCopy(release, resolution)}
    onOpen={() => onOpen(release, resolution)}
  >
    <b className="badge">{releaseEpisodesText(release)}</b>
    {release.releasedAt && <span>{new Date(release.releasedAt).toLocaleDateString()}</span>}
    <span>{availableResolutionsText(release)}</span>
  </TorrentRow>
));

export const SubsPleasePanel = ({ series, episode }) => {
  const [torrentPreferences, setTorrentPreferences] = useTorrentPreferences();

  const [resolution, setResolution] = useState(subsPleaseResolution(torrentPreferences.resolution));

  const subsPleaseShow = useSubsPleaseShow(series);
  const { openMagnet, copyMagnet } = useTorrentHandoff(series);

  const releases = subsPleaseShow.found.data?.releases ?? [];
  const visibleReleases = episode ? releasesForEpisode(releases, episode) : releasesForSeason(releases);

  const chooseResolution = (chosenResolution) => {
    setResolution(chosenResolution);
    setTorrentPreferences({ ...torrentPreferences, resolution: chosenResolution });
  };

  const openRelease = useCallback(
    (release, preferredResolution) => {
      const magnetChoice = releaseMagnet(release, preferredResolution);

      openMagnet(magnetChoice.magnet, ` (${magnetChoice.resolution}p)`);
    },
    [openMagnet],
  );

  const copyRelease = useCallback(
    (release, preferredResolution) => copyMagnet(releaseMagnet(release, preferredResolution).magnet),
    [copyMagnet],
  );

  return (
    <div className="download-panel">
      <div className="download-panel__filters">
        <ChoiceChips
          label="Resolution"
          options={SUBSPLEASE_RESOLUTION_OPTIONS}
          value={resolution}
          onChange={chooseResolution}
        />
      </div>

      <SubsPleaseShowPicker subsPleaseShow={subsPleaseShow} />

      {subsPleaseShow.found.data && !visibleReleases.length && (
        <p className="download-panel__note">
          {episode ? `No SubsPlease release of episode ${episode}.` : 'No releases listed for this show.'}
        </p>
      )}

      {visibleReleases.length > 0 && (
        <ul className="torrents">
          {visibleReleases.map((release) => (
            <SubsPleaseRelease
              key={release.id}
              release={release}
              resolution={resolution}
              onOpen={openRelease}
              onCopy={copyRelease}
            />
          ))}
        </ul>
      )}

      <TorrentAppHint series={series} />
    </div>
  );
};
