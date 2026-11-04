import { memo, useState } from 'react';
import { fetchAniListEntries, fetchMalEntries } from '@/api/services/importService';
import { Modal } from '@/components/common/Modal';
import { Tabs } from '@/components/common/Tabs';
import { IMPORT_PHASES, useListImport } from '@/hooks/useListImport';
import { pluralize } from '@/utils/format';

const IMPORT_SOURCES = [
  { id: 'anilist', label: 'AniList', fetchEntries: fetchAniListEntries },
  { id: 'mal', label: 'MyAnimeList', fetchEntries: fetchMalEntries },
];

const importSummary = ({ total, added, updated, unchanged, unmatched }) => {
  const importedText = total
    ? `Imported ${pluralize(total, 'show')}: ${added} new, ${updated} updated, ${unchanged} already up to date.`
    : 'That list is empty.';

  const unmatchedText = unmatched > 0 ? ` ${pluralize(unmatched, 'show')} couldn’t be matched on AniList.` : '';

  return importedText + unmatchedText;
};

const STATUS_NOTE_BY_PHASE = {
  [IMPORT_PHASES.running]: { className: 'download-panel__note', messageOf: (status) => status.message },
  [IMPORT_PHASES.error]: { className: 'download-panel__note is-error', messageOf: (status) => status.message },
  [IMPORT_PHASES.done]: { className: 'download-panel__note is-success', messageOf: importSummary },
};

const ImportStatusMessage = ({ importStatus }) => {
  const note = STATUS_NOTE_BY_PHASE[importStatus.phase];

  return note ? <p className={note.className}>{note.messageOf(importStatus)}</p> : null;
};

const ImportListDialog = ({ onClose }) => {
  const [sourceId, setSourceId] = useState(IMPORT_SOURCES[0].id);
  const [userName, setUserName] = useState('');

  const { importStatus, isRunning, runImport, resetImport } = useListImport();

  const source = IMPORT_SOURCES.find((candidate) => candidate.id === sourceId);
  const trimmedUserName = userName.trim();

  const switchSource = (nextSourceId) => {
    setSourceId(nextSourceId);
    resetImport();
  };

  const submitImport = (event) => {
    event.preventDefault();

    if (trimmedUserName && !isRunning) runImport(source.fetchEntries, trimmedUserName);
  };

  return (
    <Modal title="Import your list" subtitle="Brings your shows and watched episodes into My List" onClose={onClose}>
      <Tabs tabs={IMPORT_SOURCES} value={sourceId} onChange={switchSource} label="Import from" />

      <form className="download-panel" onSubmit={submitImport}>
        <label className="download-panel__label" htmlFor="import-user">
          {source.label} username
        </label>

        <div className="download-panel__search">
          <input
            id="import-user"
            className="download-panel__input"
            value={userName}
            autoComplete="off"
            onChange={(event) => setUserName(event.target.value)}
          />

          <button type="submit" className="btn btn--sm btn--primary" disabled={isRunning || !trimmedUserName}>
            {isRunning ? 'Importing…' : 'Import'}
          </button>
        </div>

        <ImportStatusMessage importStatus={importStatus} />

        <p className="download-panel__hint">
          The list has to be public. Importing again adds new shows and keeps whichever side has watched more episodes.
          Nothing is removed.
        </p>
      </form>
    </Modal>
  );
};

export const ImportDialog = memo(ImportListDialog);
