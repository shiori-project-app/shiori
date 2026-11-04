import { memo } from 'react';
import { Modal } from '@/components/common/Modal';
import { CLEANUP_ACTIONS } from '@/constants/preferences';
import { CLEANUP_PHASES } from '@/hooks/useWatchedCleanup';
import { useDisplayTitle } from '@/hooks/usePreferences';
import { formatBytes, formatDate, pluralize } from '@/utils/format';
import { totalBytes } from '@/utils/watchedCleanup';

const CleanupCandidateContent = ({ candidate, isSelected, isDisabled, onToggle }) => {
  const displayTitle = useDisplayTitle();

  return (
    <li>
      <label className="cleanup-list__item">
        <input type="checkbox" checked={isSelected} disabled={isDisabled} onChange={() => onToggle(candidate.path)} />

        <span className="cleanup-list__info">
          <b>
            {displayTitle(candidate.series)} · EP {candidate.episodeNumber}
          </b>

          <span className="cleanup-list__file">{candidate.name}</span>

          <span className="cleanup-list__meta">
            {formatBytes(candidate.bytes)} · Watched {formatDate(candidate.watchedAt)}
          </span>

          {!candidate.isConfident && (
            <span className="cleanup-list__warning">
              The file name only partly matches this show, so it isn’t ticked. Check it’s the right episode first.
            </span>
          )}
        </span>
      </label>
    </li>
  );
};

const CleanupCandidate = memo(CleanupCandidateContent);

const actionHint = (action, moveFolder, trashName) =>
  action === CLEANUP_ACTIONS.trash
    ? `They go to the ${trashName}, so you can restore them. The disk space only comes back once you empty it.`
    : `They move to ${moveFolder}, keeping their show folders.`;

const confirmLabel = (action, chosenCandidates, trashName) => {
  const size = formatBytes(totalBytes(chosenCandidates));
  const count = pluralize(chosenCandidates.length, 'episode');

  return action === CLEANUP_ACTIONS.trash ? `Send ${count} to the ${trashName} (${size})` : `Move ${count} (${size})`;
};

const finishedLabel = (action, cleaned, trashName) => {
  const size = formatBytes(cleaned.reduce((total, result) => total + result.bytes, 0));
  const count = pluralize(cleaned.length, 'episode');

  return action === CLEANUP_ACTIONS.trash
    ? `Sent ${count} to the ${trashName} (${size}).`
    : `Moved ${count} (${size}).`;
};

const CleanupOutcome = ({ action, trashName, outcome, onClose }) => (
  <div className="download-panel">
    <p className="download-panel__note">{finishedLabel(action, outcome.cleaned, trashName)}</p>

    {outcome.failed.length > 0 && (
      <>
        <p className="download-panel__note is-error" role="alert">
          {pluralize(outcome.failed.length, 'episode')} couldn’t be cleaned up and stayed where it was:
        </p>

        <ul className="cleanup-failures">
          {outcome.failed.map(({ candidate, failure }) => (
            <li key={candidate.path}>
              <b>{candidate.name}</b>: {failure}
            </li>
          ))}
        </ul>
      </>
    )}

    <div className="cta">
      <button type="button" className="btn btn--primary" onClick={onClose}>
        Close
      </button>
    </div>
  </div>
);

const CleanupReview = ({
  review,
  selectedPaths,
  phase,
  cleanedCount,
  action,
  moveFolder,
  trashName,
  afterDays,
  onToggle,
  onConfirm,
  onClose,
}) => {
  const isCleaning = phase === CLEANUP_PHASES.cleaning;
  const chosenCandidates = review.candidates.filter((candidate) => selectedPaths.has(candidate.path));

  return (
    <div className="download-panel">
      {review.skippedShows > 0 && (
        <p className="download-panel__note">
          {pluralize(review.skippedShows, 'show')} left out, because Shiori couldn’t confirm the episode numbers. Try
          again when you’re online.
        </p>
      )}

      {review.candidates.length ? (
        <>
          <ul className="cleanup-list">
            {review.candidates.map((candidate) => (
              <CleanupCandidate
                key={candidate.path}
                candidate={candidate}
                isSelected={selectedPaths.has(candidate.path)}
                isDisabled={isCleaning}
                onToggle={onToggle}
              />
            ))}
          </ul>

          <p className="download-panel__hint">
            {actionHint(action, moveFolder, trashName)} They stay marked as watched, and tracking won’t download them
            again.
          </p>
        </>
      ) : (
        <p className="download-panel__note">Nothing to clean up: no downloads you watched over {afterDays} days ago.</p>
      )}

      <div className="cta">
        {review.candidates.length > 0 && (
          <button
            type="button"
            className="btn btn--primary"
            disabled={isCleaning || !chosenCandidates.length}
            onClick={onConfirm}
          >
            {isCleaning
              ? `Working on ${Math.min(cleanedCount + 1, chosenCandidates.length)} of ${chosenCandidates.length}…`
              : confirmLabel(action, chosenCandidates, trashName)}
          </button>
        )}

        <button type="button" className="btn" disabled={isCleaning} onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
};

const WatchedCleanupDialogContent = ({
  review,
  selectedPaths,
  phase,
  cleanedCount,
  outcome,
  action,
  moveFolder,
  trashName,
  afterDays,
  onToggle,
  onConfirm,
  onClose,
}) => (
  <Modal
    title="Clean up watched episodes"
    subtitle={`Downloads you watched over ${afterDays} days ago`}
    dismissible={phase !== CLEANUP_PHASES.cleaning}
    onClose={onClose}
  >
    {phase === CLEANUP_PHASES.finished ? (
      <CleanupOutcome action={action} trashName={trashName} outcome={outcome} onClose={onClose} />
    ) : (
      <CleanupReview
        review={review}
        selectedPaths={selectedPaths}
        phase={phase}
        cleanedCount={cleanedCount}
        action={action}
        moveFolder={moveFolder}
        trashName={trashName}
        afterDays={afterDays}
        onToggle={onToggle}
        onConfirm={onConfirm}
        onClose={onClose}
      />
    )}
  </Modal>
);

export const WatchedCleanupDialog = memo(WatchedCleanupDialogContent);
