import { act, cleanup, fireEvent, render, renderHook, screen, within } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { LibraryProvider } from '@/context/LibraryContext';
import { LocalFilesContext } from '@/context/LocalFilesContext';
import { useLibrary } from '@/hooks/useLibrary';

const earlierSeasons = vi.hoisted(() => ({ episodeCount: 0 }));

vi.mock('@/hooks/usePreferences', () => ({ useDisplayTitle: () => (series) => series.title }));
vi.mock('@/api/services/seasonService', () => ({ fetchEpisodeOffset: async () => earlierSeasons.episodeCount }));

const { LinkFilesDialog } = await import('@/components/downloads/LinkFilesDialog');

const ROOT = 'D:\\Anime';
const SERIES = { id: 501, title: 'Frieren', released: 12 };

const file = (relativePath) => ({
  path: relativePath,
  name: relativePath.split('\\').at(-1),
  folder: relativePath.split('\\')[0],
  inProgress: false,
});

const FILES = [file('random stuff\\final_v2.mkv'), file('My Rips\\Ep 03.mkv'), file('My Rips\\Ep 04.mkv')];

let latestLibrary = null;

const Probe = () => {
  latestLibrary = useLibrary();

  return null;
};

const renderDialog = ({ files = FILES, episode, isUnreachable = false, root = ROOT, rescan = vi.fn() } = {}) => {
  render(
    <LocalFilesContext.Provider value={{ root, files, isUnreachable, rescan }}>
      <LibraryProvider>
        <LinkFilesDialog series={SERIES} episode={episode} onClose={() => {}} />
        <Probe />
      </LibraryProvider>
    </LocalFilesContext.Provider>,
  );

  return { rescan };
};

const rowFor = (text) => screen.getByText(text).closest('li');

const folderRowIn = (sectionName, folder) =>
  within(screen.getByRole('region', { name: sectionName }))
    .getByText(folder)
    .closest('li');

describe('LinkFilesDialog', () => {
  beforeAll(() => {
    HTMLDialogElement.prototype.showModal ??= function showModal() {
      this.open = true;
    };
  });

  afterEach(() => {
    act(() => {
      const links = latestLibrary?.fileLinks[SERIES.id];

      links?.folders.forEach((folder) => latestLibrary.unlinkFolder(SERIES.id, folder));

      Object.keys(links?.episodes ?? {}).forEach((episodeNumber) =>
        latestLibrary.unlinkEpisodeFile(SERIES.id, episodeNumber),
      );
    });

    cleanup();
    earlierSeasons.episodeCount = 0;
  });

  it('links any file to the chosen episode, saving where it really is', () => {
    renderDialog();

    const row = rowFor('final_v2.mkv');

    fireEvent.change(within(row).getByRole('spinbutton'), { target: { value: '7' } });
    fireEvent.click(within(row).getByRole('button', { name: 'Link' }));

    expect(latestLibrary.fileLinks[SERIES.id].episodes).toEqual({ 7: 'D:\\Anime\\random stuff\\final_v2.mkv' });
    expect(screen.getByText('EP 7')).toBeTruthy();
    expect(within(rowFor('final_v2.mkv')).getByRole('button', { name: 'Already EP 7' }).disabled).toBe(true);
  });

  it('says when linking would replace the file an episode already has', () => {
    renderDialog();
    fireEvent.click(within(rowFor('Ep 03.mkv')).getByRole('button', { name: 'Link' }));

    const otherRow = rowFor('Ep 04.mkv');

    fireEvent.change(within(otherRow).getByRole('spinbutton'), { target: { value: '3' } });

    const replaceButton = within(otherRow).getByRole('button', { name: 'Replace' });

    expect(replaceButton.title).toBe('Replaces Ep 03.mkv');
    fireEvent.click(replaceButton);
    expect(latestLibrary.fileLinks[SERIES.id].episodes[3]).toBe('D:\\Anime\\My Rips\\Ep 04.mkv');
  });

  it('suggests the episode being viewed', () => {
    renderDialog({ episode: 5 });
    expect(within(rowFor('final_v2.mkv')).getByRole('spinbutton').value).toBe('5');
  });

  it('updates its suggestion once the show’s earlier seasons are known', async () => {
    earlierSeasons.episodeCount = 12;
    renderDialog({ files: [file('Rips\\Ep 14.mkv')] });
    await screen.findByDisplayValue('2');
    expect(within(rowFor('Ep 14.mkv')).getByRole('spinbutton').value).toBe('2');
  });

  it('refuses an episode that has not been released', () => {
    renderDialog();

    const row = rowFor('final_v2.mkv');

    fireEvent.change(within(row).getByRole('spinbutton'), { target: { value: '99' } });
    expect(within(row).getByRole('button', { name: 'Link' }).disabled).toBe(true);
  });

  it('links a whole folder, then offers it no more', () => {
    renderDialog();
    fireEvent.click(within(folderRowIn('Folders', 'My Rips')).getByRole('button', { name: 'Link folder' }));

    expect(latestLibrary.fileLinks[SERIES.id].folders).toEqual(['D:\\Anime\\My Rips']);
    expect(within(screen.getByRole('region', { name: 'Folders' })).queryByText('My Rips')).toBeNull();
    expect(within(folderRowIn('Linked to this show', 'My Rips')).getByRole('button', { name: 'Unlink' })).toBeTruthy();
  });

  it('unlinks again', () => {
    renderDialog();
    fireEvent.click(within(folderRowIn('Folders', 'My Rips')).getByRole('button', { name: 'Link folder' }));
    fireEvent.click(within(folderRowIn('Linked to this show', 'My Rips')).getByRole('button', { name: 'Unlink' }));
    expect(latestLibrary.fileLinks[SERIES.id]).toBeUndefined();
  });

  it('tells apart files with the same name in different season folders', () => {
    renderDialog({ files: [file('Show\\Season 1\\Ep 01.mkv'), file('Show\\Season 2\\Ep 01.mkv')] });

    const files = within(screen.getByRole('region', { name: 'Files' }));

    expect(files.getByText('Show\\Season 1')).toBeTruthy();
    expect(files.getByText('Show\\Season 2')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Search your download folder'), { target: { value: 'season 2' } });
    expect(within(screen.getByRole('region', { name: 'Files' })).queryByText('Show\\Season 1')).toBeNull();
  });

  it('offers subfolders, and shows a folder’s true size while searching', () => {
    const many = Array.from({ length: 5 }, (_, index) => file(`Big\\Show ${index}.mkv`));

    renderDialog({ files: [...many, file('Big\\Season 2\\special.mkv')] });
    fireEvent.change(screen.getByLabelText('Search your download folder'), { target: { value: 'Show 3' } });
    expect(within(folderRowIn('Folders', 'Big')).getByText(/5 files/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Search your download folder'), { target: { value: 'special' } });
    expect(folderRowIn('Folders', 'Big\\Season 2')).toBeTruthy();
  });

  it('narrows files with the search box', () => {
    renderDialog();
    fireEvent.change(screen.getByLabelText('Search your download folder'), { target: { value: 'final' } });
    expect(screen.getByText('final_v2.mkv')).toBeTruthy();
    expect(screen.queryByText('Ep 03.mkv')).toBeNull();
  });

  it('says when some folders are hidden', () => {
    renderDialog({ files: Array.from({ length: 25 }, (_, index) => file(`Folder ${index}\\clip.mkv`)) });
    expect(screen.getByText(/first 20 of 25 folders/)).toBeTruthy();
  });

  it('scans when opened and again on request', () => {
    const { rescan } = renderDialog();

    expect(rescan).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Scan again' }));
    expect(rescan).toHaveBeenCalledTimes(2);
  });

  it('marks a link from another download folder as not found, and keeps it removable', () => {
    renderDialog();
    act(() => latestLibrary.linkEpisodeFile(SERIES.id, 2, 'E:\\Videos\\Ep 02.mkv'));

    const linkedRow = screen.getByText(/E:\\Videos\\Ep 02\.mkv \(not found/).closest('li');

    fireEvent.click(within(linkedRow).getByRole('button', { name: 'Unlink' }));
    expect(latestLibrary.fileLinks[SERIES.id]).toBeUndefined();
  });

  it('says it is still looking before the first scan finishes', () => {
    renderDialog({ files: [], root: '' });
    expect(screen.getByText(/Looking through your download folder/)).toBeTruthy();
  });

  it('explains an empty download folder and an unreachable one', () => {
    renderDialog({ files: [], isUnreachable: true });
    expect(screen.getByText(/can’t be reached/)).toBeTruthy();
    expect(screen.getByText(/no video files in your download folder/)).toBeTruthy();
  });

  it('opens outside its parent, so a surrounding page’s styles cannot reach it', () => {
    renderDialog();
    expect(screen.getByText('Link your files').closest('dialog').parentElement).toBe(document.body);
  });
});

describe('LibraryContext file links', () => {
  afterEach(cleanup);

  it('stores links per show', () => {
    const library = renderHook(() => useLibrary(), { wrapper: LibraryProvider }).result;

    act(() => library.current.linkEpisodeFile(777, 2, 'a.mkv'));
    act(() => library.current.linkFolder(777, 'Show'));
    expect(library.current.fileLinks[777]).toEqual({ folders: ['Show'], episodes: { 2: 'a.mkv' } });
    act(() => library.current.unlinkEpisodeFile(777, 2));
    act(() => library.current.unlinkFolder(777, 'Show'));
    expect(library.current.fileLinks[777]).toBeUndefined();
  });
});
