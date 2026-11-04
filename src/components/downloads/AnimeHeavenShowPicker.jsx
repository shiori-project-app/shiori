import { Select } from '@/components/common/Select';
import { PanelSearchForm } from '@/components/downloads/PanelSearchForm';

const ShowSearchStatus = ({ foundShows, shows }) => {
  if (foundShows.loading) return <p className="download-panel__note">Searching AnimeHeaven…</p>;
  if (foundShows.error) return <p className="download-panel__note is-error">{foundShows.error.message}</p>;

  if (foundShows.data && !shows.length) {
    return <p className="download-panel__note">No match on AnimeHeaven. Try another title above.</p>;
  }

  return null;
};

export const AnimeHeavenShowPicker = ({ animeHeavenShow }) => {
  const { searchInput, setSearchInput, search, foundShows, shows, selectedShow, pickShow } = animeHeavenShow;

  return (
    <>
      <PanelSearchForm
        id="animeheaven-query"
        label="Search AnimeHeaven"
        value={searchInput}
        onChange={setSearchInput}
        onSubmit={search}
      />

      <ShowSearchStatus foundShows={foundShows} shows={shows} />

      {shows.length > 0 && (
        <>
          <label className="download-panel__label" htmlFor="animeheaven-show">
            Show on AnimeHeaven <span className="download-panel__tag">1080p · subbed</span>
          </label>

          <Select
            id="animeheaven-show"
            className="download-panel__select"
            value={selectedShow?.code ?? ''}
            onChange={pickShow}
            options={shows.map((show) => [show.code, show.title])}
          />
        </>
      )}
    </>
  );
};
