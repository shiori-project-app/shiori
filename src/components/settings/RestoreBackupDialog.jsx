import { memo } from 'react';
import { Modal } from '@/components/common/Modal';
import { formatDateTime, pluralize } from '@/utils/format';

const backupDateText = (exportedAt) => (exportedAt ? `Made ${formatDateTime(Date.parse(exportedAt))}. ` : '');

const RestoreBackupConfirmation = ({ backup, isRestoring, errorMessage, onConfirm, onCancel }) => (
  <Modal title="Restore this backup?" subtitle={backup.path} dismissible={!isRestoring} onClose={onCancel}>
    <div className="download-panel">
      <p className="download-panel__note">{backupDateText(backup.exportedAt)}It holds:</p>

      <ul className="backup__summary">
        <li>{pluralize(backup.summary.list, 'title')} in My List</li>
        <li>Watched episodes for {pluralize(backup.summary.watchedShows, 'show')}</li>
        <li>{pluralize(backup.summary.history, 'history entry', 'history entries')}</li>
        <li>{pluralize(backup.summary.notes, 'note')}</li>
        <li>{pluralize(backup.summary.tracked, 'tracked show')}</li>
      </ul>

      <p className="download-panel__hint">
        Everything in Shiori now is replaced. A copy of it is kept in Shiori’s backups folder.
      </p>

      {errorMessage && (
        <p className="download-panel__note is-error" role="alert">
          Couldn’t restore this backup. {errorMessage}
        </p>
      )}

      <div className="cta">
        <button type="button" className="btn btn--primary" disabled={isRestoring} onClick={onConfirm}>
          {isRestoring ? 'Restoring…' : 'Restore'}
        </button>

        <button type="button" className="btn" disabled={isRestoring} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  </Modal>
);

export const RestoreBackupDialog = memo(RestoreBackupConfirmation);
