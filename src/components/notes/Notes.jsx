import { memo, useCallback, useState } from 'react';
import { Icon } from '@/components/common/Icon';
import { useLibrary } from '@/hooks/useLibrary';
import { formatDateTime } from '@/utils/format';

const NOTE_MAX_LENGTH = 400;

const NoteItem = memo(({ note, onDelete }) => (
  <li className="note">
    <div>
      <p className="note__text">{note.text}</p>
      <small className="note__date">{formatDateTime(note.createdAt)}</small>
    </div>

    <button type="button" className="note__delete" aria-label="Delete note" onClick={() => onDelete(note.id)}>
      <Icon name="trash" />
    </button>
  </li>
));

export const Notes = ({ episodeId }) => {
  const { notes, addNote, deleteNote } = useLibrary();

  const [draftText, setDraftText] = useState('');

  const episodeNotes = notes[episodeId] || [];

  const submitNote = (event) => {
    event.preventDefault();

    const trimmedText = draftText.trim();

    if (!trimmedText) return;

    addNote(episodeId, trimmedText);
    setDraftText('');
  };

  const deleteEpisodeNote = useCallback((noteId) => deleteNote(episodeId, noteId), [deleteNote, episodeId]);

  return (
    <section className="notes">
      <h2 className="notes__title">Notes</h2>

      <form className="notes__form" onSubmit={submitNote}>
        <label className="sr-only" htmlFor="note-input">
          Add a note
        </label>

        <input
          id="note-input"
          className="notes__input"
          type="text"
          placeholder="Write a note about this episode"
          maxLength={NOTE_MAX_LENGTH}
          autoComplete="off"
          value={draftText}
          onChange={(event) => setDraftText(event.target.value)}
        />

        <button type="submit" className="btn btn--sm btn--primary">
          Add
        </button>
      </form>

      {episodeNotes.length ? (
        <ul className="notes__list">
          {episodeNotes.map((note) => (
            <NoteItem key={note.id} note={note} onDelete={deleteEpisodeNote} />
          ))}
        </ul>
      ) : (
        <p className="notes__empty">No notes for this episode yet.</p>
      )}
    </section>
  );
};
