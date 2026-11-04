import { memo } from 'react';
import { Switch } from '@/components/common/Switch';
import { ChoiceChips } from '@/components/downloads/ChoiceChips';
import { PanelSearchForm } from '@/components/downloads/PanelSearchForm';
import { TorrentAppHint } from '@/components/downloads/TorrentAppHint';
import { TorrentRow } from '@/components/downloads/TorrentRow';
import { RESOLUTION_OPTIONS } from '@/constants/torrents';
import { useNyaaSearch } from '@/hooks/useNyaaSearch';
import { useTorrentHandoff } from '@/hooks/useTorrentHandoff';
import { cx } from '@/utils/classNames';

const NyaaTorrent = memo(({ torrent, episodeNumber, onOpen, onCopy }) => (
  <TorrentRow title={torrent.title} onCopy={() => onCopy(torrent.magnet)} onOpen={() => onOpen(torrent.magnet)}>
    {episodeNumber != null && <b className="badge">Episode {episodeNumber}</b>}
    {torrent.trusted && <b className="badge">Trusted</b>}
    <span>{torrent.size}</span>
    <span className="torrent__seeders">{torrent.seeders} seeders</span>
    <span>{torrent.leechers} leechers</span>
    {torrent.publishedAt && <span>{new Date(torrent.publishedAt).toLocaleDateString()}</span>}

    <a href={torrent.pageUrl} target="_blank" rel="noopener noreferrer">
      Nyaa page
    </a>
  </TorrentRow>
));

const TorrentFilters = ({ nyaaSearch }) => {
  const { torrentPreferences, setTorrentPreferences, trustedOnly, toggleTrustedOnly } = nyaaSearch;
  const isDubOnly = torrentPreferences.audio === 'dub';

  return (
    <div className="download-panel__filters">
      <ChoiceChips
        label="Resolution"
        options={RESOLUTION_OPTIONS}
        value={torrentPreferences.resolution}
        onChange={(resolution) => setTorrentPreferences({ ...torrentPreferences, resolution })}
      >
        <button
          type="button"
          className={cx('chip chip--sm', isDubOnly && 'is-active')}
          aria-pressed={isDubOnly}
          onClick={() => setTorrentPreferences({ ...torrentPreferences, audio: isDubOnly ? 'any' : 'dub' })}
        >
          English dub
        </button>
      </ChoiceChips>

      <Switch label="Trusted only" checked={trustedOnly} onChange={toggleTrustedOnly} />
    </div>
  );
};

const HiddenResultsNote = ({ episode, visibleCount, hiddenCount, onShow }) => (
  <p className="download-panel__note">
    {visibleCount ? '' : `No torrents are clearly episode ${episode} of this season. `}
    {hiddenCount} other {hiddenCount === 1 ? 'result is' : 'results are'} hidden (other episodes or seasons).{' '}
    <button type="button" className="download-panel__link" onClick={onShow}>
      Show them
    </button>
  </p>
);

export const NyaaPanel = ({ series, episode }) => {
  const nyaaSearch = useNyaaSearch(series, episode);

  const { search, searchInput, setSearchInput, submitSearch, preferredTorrents, visibleTorrents, hiddenCount } =
    nyaaSearch;

  const { openMagnet, copyMagnet } = useTorrentHandoff(series);

  return (
    <div className="download-panel">
      <PanelSearchForm
        id="nyaa-query"
        label="Search Nyaa"
        value={searchInput}
        onChange={setSearchInput}
        onSubmit={submitSearch}
      />

      <TorrentFilters nyaaSearch={nyaaSearch} />

      {search.loading && <p className="download-panel__note">Searching Nyaa…</p>}
      {search.error && <p className="download-panel__note is-error">{search.error.message}</p>}

      {search.data && !preferredTorrents.length && (
        <p className="download-panel__note">No torrents found. Try editing the search above.</p>
      )}

      {episode && hiddenCount > 0 && (
        <HiddenResultsNote
          episode={episode}
          visibleCount={visibleTorrents.length}
          hiddenCount={hiddenCount}
          onShow={nyaaSearch.showOtherEpisodes}
        />
      )}

      {visibleTorrents.length > 0 && (
        <ul className="torrents">
          {visibleTorrents.map((torrent) => (
            <NyaaTorrent
              key={torrent.id}
              torrent={torrent}
              episodeNumber={nyaaSearch.episodeOf(torrent)}
              onOpen={openMagnet}
              onCopy={copyMagnet}
            />
          ))}
        </ul>
      )}

      <TorrentAppHint series={series} />
    </div>
  );
};
