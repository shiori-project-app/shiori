import { memo, useContext, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { fetchEpisodeOffset } from '@/api/services/seasonService';
import { Modal } from '@/components/common/Modal';
import { LocalFilesContext } from '@/context/LocalFilesContext';
import { useAsync } from '@/hooks/useAsync';
import { useLibrary } from '@/hooks/useLibrary';
import { useLocalEpisodes } from '@/hooks/useLocalEpisodes';
import { useDisplayTitle } from '@/hooks/usePreferences';
import {
  directoryOf,
  filesMatchingSearch,
  foldersOfFiles,
  isLinkableEpisode,
  linksOfSeries,
  locationInRoot,
  pathInsideRoot,
  suggestedEpisodeForFile,
} from '@/utils/fileLinks';
import { pluralize } from '@/utils/format';

const MAX_VISIBLE_FILES = 100;
const MAX_VISIBLE_FOLDERS = 20;

const LinkRow = ({ title, detail, children }) => (
  <li className="link-files__row">
    <span className="link-files__name">
      <b title={title}>{title}</b>
      {detail && <small title={detail}>{detail}</small>}
    </span>

    {children}
  </li>
);

const UnlinkRowContent = ({ title, detail, linkId, onUnlink }) => (
  <LinkRow title={title} detail={detail}>
    <button type="button" className="btn btn--sm" onClick={() => onUnlink(linkId)}>
      Unlink
    </button>
  </LinkRow>
);

const UnlinkRow = memo(UnlinkRowContent);

const FolderRowContent = ({ folder, fileCount, onLink }) => (
  <LinkRow
    title={folder}
    detail={`${pluralize(fileCount, 'file')} directly inside; episode numbers come from the file names`}
  >
    <button type="button" className="btn btn--sm" onClick={() => onLink(folder)}>
      Link folder
    </button>
  </LinkRow>
);

const FolderRow = memo(FolderRowContent);

const linkButtonLabel = (episodeNumber, isAlreadyThisFile, fileAtEpisode) => {
  if (isAlreadyThisFile) return `Already EP ${episodeNumber}`;

  return fileAtEpisode ? 'Replace' : 'Link';
};

const FileRowContent = ({ file, series, preferredEpisode, earlierSeasonsEpisodeCount, localEpisodeFiles, onLink }) => {
  const [editedEpisodeText, setEditedEpisodeText] = useState(null);

  const suggestedEpisode = suggestedEpisodeForFile(file, series, preferredEpisode, earlierSeasonsEpisodeCount);
  const episodeText = editedEpisodeText ?? String(suggestedEpisode);
  const episodeNumber = Number(episodeText);

  const fileAtEpisode = localEpisodeFiles.get(episodeNumber);
  const isAlreadyThisFile = fileAtEpisode?.path === file.path;

  return (
    <LinkRow title={file.name} detail={directoryOf(file)}>
      <label className="link-files__episode">
        <span>EP</span>

        <input
          type="number"
          className="download-panel__input"
          min="1"
          max={series.released}
          value={episodeText}
          aria-label={`Episode number for ${file.name}`}
          onChange={(event) => setEditedEpisodeText(event.target.value)}
        />
      </label>

      <button
        type="button"
        className="btn btn--sm btn--primary"
        disabled={!isLinkableEpisode(episodeNumber, series) || isAlreadyThisFile}
        title={fileAtEpisode && !isAlreadyThisFile ? `Replaces ${fileAtEpisode.name}` : undefined}
        onClick={() => onLink(episodeNumber, file.path)}
      >
        {linkButtonLabel(episodeNumber, isAlreadyThisFile, fileAtEpisode)}
      </button>
    </LinkRow>
  );
};

const FileRow = memo(FileRowContent);

const RowSection = ({ title, children }) => (
  <section aria-label={title}>
    <h3 className="link-files__heading">{title}</h3>
    {children}
  </section>
);

const HiddenRowsHint = ({ shownCount, totalCount, noun }) =>
  totalCount > shownCount && (
    <p className="download-panel__hint">
      Showing the first {shownCount} of {totalCount} {noun}. Search to narrow them down.
    </p>
  );

const NOT_FOUND = 'not found in your download folder';

const folderLinkDetail = (fileCount) =>
  `Whole folder · ${fileCount == null ? NOT_FOUND : pluralize(fileCount, 'file')}`;

const CurrentLinks = ({ links, root, files, allFolders, actions }) => {
  const fileLocations = useMemo(() => new Set(files.map((file) => locationInRoot(root, file.path))), [files, root]);

  const fileCountInFolder = (folderLocation) =>
    allFolders.find(({ folder }) => locationInRoot(root, folder) === folderLocation)?.fileCount;

  const episodeLinks = Object.entries(links.episodes);

  if (!links.folders.length && !episodeLinks.length) return null;

  return (
    <RowSection title="Linked to this show">
      <ul className="link-files__list">
        {links.folders.map((folderLocation) => (
          <UnlinkRow
            key={folderLocation}
            title={pathInsideRoot(root, folderLocation)}
            detail={folderLinkDetail(fileCountInFolder(folderLocation))}
            linkId={folderLocation}
            onUnlink={actions.unlinkFolder}
          />
        ))}

        {episodeLinks.map(([episodeNumber, fileLocation]) => {
          const label = pathInsideRoot(root, fileLocation);

          return (
            <UnlinkRow
              key={episodeNumber}
              title={`EP ${episodeNumber}`}
              detail={fileLocations.has(fileLocation) ? label : `${label} (${NOT_FOUND})`}
              linkId={episodeNumber}
              onUnlink={actions.unlinkEpisode}
            />
          );
        })}
      </ul>
    </RowSection>
  );
};

const emptyFilesMessage = (root, fileCount) => {
  if (!root) return 'Looking through your download folder…';

  return fileCount ? 'No video files match that search.' : 'There are no video files in your download folder.';
};

const useLinkActions = (seriesId, root) => {
  const { linkEpisodeFile, unlinkEpisodeFile, linkFolder, unlinkFolder } = useLibrary();

  return useMemo(
    () => ({
      linkEpisode: (episodeNumber, path) => linkEpisodeFile(seriesId, episodeNumber, locationInRoot(root, path)),
      unlinkEpisode: (episodeNumber) => unlinkEpisodeFile(seriesId, episodeNumber),
      linkFolder: (folder) => linkFolder(seriesId, locationInRoot(root, folder)),
      unlinkFolder: (folderLocation) => unlinkFolder(seriesId, folderLocation),
    }),
    [linkEpisodeFile, unlinkEpisodeFile, linkFolder, unlinkFolder, seriesId, root],
  );
};

const LinkFilesDialogContent = ({ series, episode, onClose }) => {
  const { root, files, isUnreachable, rescan } = useContext(LocalFilesContext);
  const { fileLinks } = useLibrary();
  const displayTitle = useDisplayTitle();
  const localEpisodeFiles = useLocalEpisodes(series);

  const earlierSeasonsEpisodeCount = useAsync(() => fetchEpisodeOffset(series.id), [series.id]).data ?? 0;

  const [search, setSearch] = useState('');

  const deferredSearch = useDeferredValue(search);
  const actions = useLinkActions(series.id, root);

  useEffect(() => {
    rescan();
  }, [rescan]);

  const links = useMemo(() => linksOfSeries(fileLinks, series.id), [fileLinks, series.id]);
  const allFolders = useMemo(() => foldersOfFiles(files), [files]);
  const matchingFiles = useMemo(() => filesMatchingSearch(files, deferredSearch), [files, deferredSearch]);

  const matchingFolders = useMemo(() => {
    const foldersWithMatches = new Set(matchingFiles.map(directoryOf));

    return allFolders.filter(
      ({ folder }) => foldersWithMatches.has(folder) && !links.folders.includes(locationInRoot(root, folder)),
    );
  }, [allFolders, matchingFiles, links.folders, root]);

  return (
    <Modal
      title="Link your files"
      subtitle={`Tell Shiori which files belong to ${displayTitle(series)}`}
      onClose={onClose}
    >
      <div className="download-panel link-files">
        {isUnreachable && <p className="download-panel__note is-error">Your download folder can’t be reached.</p>}

        <CurrentLinks links={links} root={root} files={files} allFolders={allFolders} actions={actions} />

        <label className="download-panel__label" htmlFor="link-files-search">
          Search your download folder
        </label>

        <div className="download-panel__search">
          <input
            id="link-files-search"
            className="download-panel__input"
            value={search}
            autoComplete="off"
            placeholder="File or folder name"
            onChange={(event) => setSearch(event.target.value)}
          />

          <button type="button" className="btn btn--sm" onClick={rescan}>
            Scan again
          </button>
        </div>

        {matchingFolders.length > 0 && (
          <RowSection title="Folders">
            <ul className="link-files__list">
              {matchingFolders.slice(0, MAX_VISIBLE_FOLDERS).map(({ folder, fileCount }) => (
                <FolderRow key={folder} folder={folder} fileCount={fileCount} onLink={actions.linkFolder} />
              ))}
            </ul>

            <HiddenRowsHint shownCount={MAX_VISIBLE_FOLDERS} totalCount={matchingFolders.length} noun="folders" />
          </RowSection>
        )}

        <RowSection title="Files">
          {matchingFiles.length > 0 ? (
            <ul className="link-files__list">
              {matchingFiles.slice(0, MAX_VISIBLE_FILES).map((file) => (
                <FileRow
                  key={file.path}
                  file={file}
                  series={series}
                  preferredEpisode={episode}
                  earlierSeasonsEpisodeCount={earlierSeasonsEpisodeCount}
                  localEpisodeFiles={localEpisodeFiles}
                  onLink={actions.linkEpisode}
                />
              ))}
            </ul>
          ) : (
            <p className="download-panel__note">{emptyFilesMessage(root, files.length)}</p>
          )}

          <HiddenRowsHint shownCount={MAX_VISIBLE_FILES} totalCount={matchingFiles.length} noun="files" />
        </RowSection>

        <p className="download-panel__hint">
          Only files inside your download folder can be linked{root ? ` (${root})` : ''}. Move other files there first.
        </p>
      </div>
    </Modal>
  );
};

export const LinkFilesDialog = memo(LinkFilesDialogContent);
