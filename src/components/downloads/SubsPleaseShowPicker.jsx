import { useState } from 'react';
import { Select } from '@/components/common/Select';
import { PanelSearchForm } from '@/components/downloads/PanelSearchForm';
import { pluralize } from '@/utils/format';

const MatchedShowNote = ({ foundShow, isPickedByHand, onUndo }) => (
  <p className="download-panel__note">
    On SubsPlease as “{foundShow.show}”
    {foundShow.offset > 0 && ` (its episode ${foundShow.offset + 1} is episode 1 here)`}.{' '}
    {isPickedByHand && (
      <button type="button" className="download-panel__link" onClick={onUndo}>
        Undo
      </button>
    )}
  </p>
);

const ShowLookupStatus = ({ subsPleaseShow }) => {
  const { found, picked, pick } = subsPleaseShow;

  if (found.loading) return <p className="download-panel__note">Looking for the show on SubsPlease…</p>;
  if (found.error) return <p className="download-panel__note is-error">{found.error.message}</p>;

  if (!found.data) {
    return (
      <p className="download-panel__note is-error">
        Couldn’t find this show on SubsPlease automatically. Search its show list below.
      </p>
    );
  }

  return <MatchedShowNote foundShow={found.data} isPickedByHand={Boolean(picked)} onUndo={() => pick(null)} />;
};

const ShowSearchResults = ({ subsPleaseShow }) => {
  const { matches, query, picked, pick } = subsPleaseShow;

  if (matches.loading && query) return <p className="download-panel__note">Searching…</p>;
  if (matches.error) return <p className="download-panel__note is-error">{matches.error.message}</p>;
  if (!matches.data) return null;
  if (!matches.data.length) return <p className="download-panel__note">No SubsPlease show contains “{query}”.</p>;

  return (
    <>
      <label className="download-panel__label" htmlFor="subsplease-show">
        {pluralize(matches.data.length, 'show')} on SubsPlease
      </label>

      <Select
        id="subsplease-show"
        className="download-panel__select"
        value={picked}
        onChange={pick}
        placeholder="Choose a show…"
        options={matches.data.map((title) => [title, title])}
      />
    </>
  );
};

export const SubsPleaseShowPicker = ({ subsPleaseShow }) => {
  const [searchInput, setSearchInput] = useState('');

  return (
    <>
      <ShowLookupStatus subsPleaseShow={subsPleaseShow} />

      <PanelSearchForm
        id="subsplease-query"
        label="Search SubsPlease shows"
        placeholder="Not the right show? Search SubsPlease…"
        value={searchInput}
        onChange={setSearchInput}
        onSubmit={() => subsPleaseShow.search(searchInput.trim())}
      />

      <ShowSearchResults subsPleaseShow={subsPleaseShow} />
    </>
  );
};
