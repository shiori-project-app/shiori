import { memo } from 'react';
import { Modal } from '@/components/common/Modal';
import { Select } from '@/components/common/Select';
import { Tabs } from '@/components/common/Tabs';
import { AnimeHeavenShowPicker } from '@/components/downloads/AnimeHeavenShowPicker';
import { SubsPleaseShowPicker } from '@/components/downloads/SubsPleaseShowPicker';
import { AUDIO_OPTIONS, RESOLUTION_OPTIONS, SUBSPLEASE_RESOLUTION_OPTIONS } from '@/constants/torrents';
import { useDisplayTitle } from '@/hooks/usePreferences';
import { useSettings } from '@/hooks/useSettings';
import { TRACKING_SOURCES, useTrackForm } from '@/hooks/useTrackForm';
import { showFolderLabel } from '@/utils/downloads';

const TRACKING_SOURCE_TABS = [
  { id: TRACKING_SOURCES.animeHeaven, label: 'AnimeHeaven', hint: 'Downloads in Shiori' },
  { id: TRACKING_SOURCES.subsPlease, label: 'SubsPlease', hint: 'Torrents via qBittorrent' },
  { id: TRACKING_SOURCES.nyaa, label: 'Nyaa', hint: 'Torrents via qBittorrent' },
];

const FIRST_EPISODE = 1;

const LabeledSelect = ({ id, label, value, options, onChange }) => (
  <div className="download-panel__field">
    <label className="download-panel__label" htmlFor={id}>
      {label}
    </label>

    <Select id={id} value={value} onChange={onChange} options={options} />
  </div>
);

const SourceOptions = ({ form }) => {
  if (form.source === TRACKING_SOURCES.animeHeaven) {
    return <AnimeHeavenShowPicker animeHeavenShow={form.animeHeavenShow} />;
  }

  if (form.source === TRACKING_SOURCES.subsPlease) {
    return (
      <>
        <LabeledSelect
          id="track-subsplease-resolution"
          label="Resolution"
          value={form.subsPleaseQuality}
          onChange={form.setResolution}
          options={SUBSPLEASE_RESOLUTION_OPTIONS}
        />

        <SubsPleaseShowPicker subsPleaseShow={form.subsPleaseShow} />
      </>
    );
  }

  return (
    <div className="download-panel__fields">
      <LabeledSelect
        id="track-resolution"
        label="Resolution"
        value={form.resolution}
        onChange={form.setResolution}
        options={RESOLUTION_OPTIONS}
      />

      <LabeledSelect
        id="track-audio"
        label="Audio"
        value={form.audio}
        onChange={form.setAudio}
        options={AUDIO_OPTIONS}
      />
    </div>
  );
};

const EpisodeScopeChoice = ({ form }) => (
  <fieldset className="download-panel__choices">
    <legend className="download-panel__label">Which episodes</legend>

    {form.isAiring && (
      <label className="download-panel__choice">
        <input
          type="radio"
          name="from"
          checked={form.fromEpisode >= form.firstNewEpisode}
          onChange={() => form.setFromEpisode(form.firstNewEpisode)}
        />
        Only new episodes (from EP {form.firstNewEpisode})
      </label>
    )}

    <label className="download-panel__choice">
      <input
        type="radio"
        name="from"
        checked={form.fromEpisode === FIRST_EPISODE}
        onChange={() => form.setFromEpisode(FIRST_EPISODE)}
      />

      {form.isAiring ? 'New episodes, plus any aired ones I don’t have' : 'All episodes I don’t have'}
    </label>
  </fieldset>
);

const TrackSeriesDialog = ({ series, onClose }) => {
  const { downloadDir } = useSettings();
  const displayTitle = useDisplayTitle();
  const form = useTrackForm(series);

  const stopAndClose = () => {
    form.stopTracking();
    onClose();
  };

  return (
    <Modal
      title={form.existingEntry ? 'Tracking' : 'Track new episodes'}
      subtitle={displayTitle(series)}
      onClose={onClose}
    >
      <Tabs tabs={TRACKING_SOURCE_TABS} value={form.source} onChange={form.setSource} label="Download source" />

      <div className="download-panel">
        <SourceOptions form={form} />
        <EpisodeScopeChoice form={form} />

        <div className="cta">
          <button type="button" className="btn btn--primary" disabled={!form.canSave} onClick={form.saveTracking}>
            {form.existingEntry ? 'Save' : 'Start tracking'}
          </button>

          {form.existingEntry && (
            <button type="button" className="btn" onClick={stopAndClose}>
              Stop tracking
            </button>
          )}
        </div>

        {form.isSaved && (
          <p className="download-panel__note is-success">
            Saved. Shiori is checking now, then again shortly after each new episode airs (while it’s open).
          </p>
        )}

        <p className="download-panel__hint">
          Episodes already in {showFolderLabel(downloadDir, series.title)} are skipped.
          {form.source === TRACKING_SOURCES.nyaa &&
            ' Picks the most-seeded matching torrent (trusted uploaders first).'}
        </p>
      </div>
    </Modal>
  );
};

export const TrackDialog = memo(TrackSeriesDialog);
