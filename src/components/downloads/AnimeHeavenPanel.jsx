import { useState } from 'react';
import { Link } from 'react-router';
import { AnimeHeavenShowPicker } from '@/components/downloads/AnimeHeavenShowPicker';
import { ROUTES } from '@/constants/routes';
import { QUEUE_STATUS, useAnimeHeavenQueue } from '@/hooks/useAnimeHeavenQueue';
import { useAnimeHeavenShow } from '@/hooks/useAnimeHeavenShow';
import { useLocalEpisodes } from '@/hooks/useLocalEpisodes';
import { useSettings } from '@/hooks/useSettings';
import { cx } from '@/utils/classNames';
import { showFolderLabel } from '@/utils/downloads';
import { pluralize } from '@/utils/format';

const FIRST_EPISODE = 1;

const EpisodeRangeInputs = ({ firstAvailable, lastAvailable, rangeStart, rangeEnd, onChange }) => (
  <div className="download-panel__range">
    <span className="download-panel__label">Episodes</span>

    <input
      type="number"
      className="download-panel__number"
      aria-label="From episode"
      min={firstAvailable}
      max={rangeEnd}
      value={rangeStart}
      onChange={(event) => onChange({ start: Number(event.target.value) || firstAvailable, end: rangeEnd })}
    />

    <span>to</span>

    <input
      type="number"
      className="download-panel__number"
      aria-label="To episode"
      min={rangeStart}
      max={lastAvailable}
      value={rangeEnd}
      onChange={(event) => onChange({ start: rangeStart, end: Number(event.target.value) || lastAvailable })}
    />

    <span className="download-panel__note">of {lastAvailable} on AnimeHeaven</span>
  </div>
);

const QueueStatusNote = ({ queueStatus }) => {
  const isFinished = queueStatus.kind !== QUEUE_STATUS.preparing;

  return (
    <p className={cx('download-panel__note', isFinished && `is-${queueStatus.kind}`)}>
      {queueStatus.message} {isFinished && <Link to={ROUTES.downloads}>Open Downloads</Link>}
    </p>
  );
};

const EpisodeAvailabilityNotes = ({ animeHeavenShow, availableEpisodes, episode, selectedEpisodes }) => {
  const { episodes, selectedShow } = animeHeavenShow;

  return (
    <>
      {episodes.loading && selectedShow && <p className="download-panel__note">Loading episodes…</p>}
      {episodes.error && <p className="download-panel__note is-error">{episodes.error.message}</p>}

      {selectedShow && episodes.data && !availableEpisodes.length && (
        <p className="download-panel__note">This show has no episodes on AnimeHeaven yet.</p>
      )}

      {availableEpisodes.length > 0 && episode && !selectedEpisodes.length && (
        <p className="download-panel__note">Episode {episode} isn’t on AnimeHeaven for this show.</p>
      )}
    </>
  );
};

export const AnimeHeavenPanel = ({ series, episode }) => {
  const { downloadDir } = useSettings();
  const localEpisodeFiles = useLocalEpisodes(series);
  const animeHeavenShow = useAnimeHeavenShow(series);
  const { queueStatus, isPreparing, queueForDownload } = useAnimeHeavenQueue(series);

  const [editedRange, setEditedRange] = useState(null);

  const availableEpisodes = animeHeavenShow.episodes.data ?? [];
  const firstAvailable = availableEpisodes[0]?.episodeNumber ?? FIRST_EPISODE;
  const lastAvailable = availableEpisodes.at(-1)?.episodeNumber ?? FIRST_EPISODE;

  const rangeStart = editedRange?.start ?? firstAvailable;
  const rangeEnd = editedRange?.end ?? lastAvailable;

  const selectedEpisodes = availableEpisodes.filter(({ episodeNumber }) =>
    episode ? episodeNumber === episode : episodeNumber >= rangeStart && episodeNumber <= rangeEnd,
  );

  const episodesToDownload = selectedEpisodes.filter(({ episodeNumber }) => !localEpisodeFiles.has(episodeNumber));
  const alreadyDownloadedCount = selectedEpisodes.length - episodesToDownload.length;

  return (
    <div className="download-panel">
      <AnimeHeavenShowPicker animeHeavenShow={animeHeavenShow} />

      <EpisodeAvailabilityNotes
        animeHeavenShow={animeHeavenShow}
        availableEpisodes={availableEpisodes}
        episode={episode}
        selectedEpisodes={selectedEpisodes}
      />

      {availableEpisodes.length > 0 && !episode && (
        <EpisodeRangeInputs
          firstAvailable={firstAvailable}
          lastAvailable={lastAvailable}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          onChange={setEditedRange}
        />
      )}

      {selectedEpisodes.length > 0 && (
        <button
          type="button"
          className="btn btn--primary"
          disabled={!episodesToDownload.length || isPreparing}
          onClick={() => queueForDownload(episodesToDownload)}
        >
          {episode ? `Download Episode ${episode}` : `Download ${pluralize(episodesToDownload.length, 'episode')}`}
        </button>
      )}

      {alreadyDownloadedCount > 0 && (
        <p className="download-panel__note">
          {episode
            ? 'You already have this episode.'
            : `${pluralize(alreadyDownloadedCount, 'episode')} already in your folder.`}
        </p>
      )}

      {queueStatus && <QueueStatusNote queueStatus={queueStatus} />}
      <p className="download-panel__hint">Saved to {showFolderLabel(downloadDir, series.title)}.</p>
    </div>
  );
};
