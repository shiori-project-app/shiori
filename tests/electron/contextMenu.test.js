import { beforeEach, describe, expect, it, vi } from 'vitest';

const electron = vi.hoisted(() => ({
  popup: vi.fn(),
  buildFromTemplate: vi.fn(),
  openExternal: vi.fn(),
  writeText: vi.fn(),
  fromWebContents: vi.fn(() => 'the window'),
}));

vi.mock('electron', () => ({
  BrowserWindow: { fromWebContents: electron.fromWebContents },
  clipboard: { writeText: electron.writeText },
  Menu: { buildFromTemplate: electron.buildFromTemplate },
  shell: { openExternal: electron.openExternal },
}));

const { contextMenuTemplate, showContextMenuOnRightClick } = await import('../../electron/contextMenu.js');

const ALL_ALLOWED = { canUndo: true, canRedo: true, canCut: true, canCopy: true, canPaste: true, canSelectAll: true };

const params = (overrides = {}) => ({
  isEditable: false,
  editFlags: ALL_ALLOWED,
  dictionarySuggestions: [],
  selectionText: '',
  linkURL: '',
  mediaType: 'none',
  hasImageContents: false,
  x: 10,
  y: 20,
  ...overrides,
});

const fakeWebContents = ({ canGoBack = true, canGoForward = false } = {}) => ({
  on: vi.fn(),
  replaceMisspelling: vi.fn(),
  copyImageAt: vi.fn(),

  navigationHistory: {
    canGoBack: () => canGoBack,
    canGoForward: () => canGoForward,
    goBack: vi.fn(),
    goForward: vi.fn(),
  },
});

const nameOf = (item) => item.type ?? item.role ?? item.label;

const namesIn = (template) => template.map(nameOf);

const itemNamed = (template, name) => template.find((item) => nameOf(item) === name);

describe('contextMenuTemplate', () => {
  beforeEach(() => vi.clearAllMocks());

  it('offers editing in a text box', () => {
    expect(namesIn(contextMenuTemplate(params({ isEditable: true }), fakeWebContents()))).toEqual([
      'undo',
      'redo',
      'separator',
      'cut',
      'copy',
      'paste',
      'separator',
      'selectAll',
    ]);
  });

  it('disables what a text box can’t do right now', () => {
    const template = contextMenuTemplate(
      params({ isEditable: true, editFlags: { ...ALL_ALLOWED, canCut: false, canCopy: false } }),
      fakeWebContents(),
    );

    expect(itemNamed(template, 'cut').enabled).toBe(false);
    expect(itemNamed(template, 'copy').enabled).toBe(false);
    expect(itemNamed(template, 'paste').enabled).toBe(true);
  });

  it('puts spelling fixes first and applies the chosen one', () => {
    const webContents = fakeWebContents();

    const template = contextMenuTemplate(
      params({ isEditable: true, dictionarySuggestions: ['episode', 'episodes'] }),
      webContents,
    );

    expect(namesIn(template).slice(0, 3)).toEqual(['episode', 'episodes', 'separator']);
    itemNamed(template, 'episodes').click();
    expect(webContents.replaceMisspelling).toHaveBeenCalledWith('episodes');
  });

  it('copies selected text on the page', () => {
    const template = contextMenuTemplate(params({ selectionText: 'Frieren' }), fakeWebContents());

    expect(namesIn(template)).toEqual(['copy']);
  });

  it('ignores a selection of only spaces', () => {
    const template = contextMenuTemplate(params({ selectionText: '  \n ' }), fakeWebContents());

    expect(namesIn(template)).toEqual(['Back', 'Forward']);
  });

  it('opens and copies a web link', () => {
    const template = contextMenuTemplate(params({ linkURL: 'https://anilist.co/anime/1' }), fakeWebContents());

    itemNamed(template, 'Open link in browser').click();
    itemNamed(template, 'Copy link address').click();
    expect(electron.openExternal).toHaveBeenCalledWith('https://anilist.co/anime/1');
    expect(electron.writeText).toHaveBeenCalledWith('https://anilist.co/anime/1');
  });

  it('offers nothing for links inside the app or unsafe ones', () => {
    ['file:///D:/Shiori/dist/index.html#/anime/1', 'javascript:alert(1)', 'file:///C:/Windows/notepad.exe'].forEach(
      (linkURL) => {
        const template = contextMenuTemplate(params({ linkURL }), fakeWebContents());

        expect(namesIn(template)).toEqual(['Back', 'Forward']);
      },
    );
  });

  it('copies an image from where it was clicked', () => {
    const webContents = fakeWebContents();
    const template = contextMenuTemplate(params({ mediaType: 'image', hasImageContents: true }), webContents);

    itemNamed(template, 'Copy image').click();
    expect(webContents.copyImageAt).toHaveBeenCalledWith(10, 20);
  });

  it('skips an image that hasn’t loaded', () => {
    const template = contextMenuTemplate(params({ mediaType: 'image' }), fakeWebContents());

    expect(namesIn(template)).toEqual(['Back', 'Forward']);
  });

  it('separates everything that applies to one spot', () => {
    const template = contextMenuTemplate(
      params({
        selectionText: 'Frieren',
        linkURL: 'https://anilist.co/anime/1',
        mediaType: 'image',
        hasImageContents: true,
      }),
      fakeWebContents(),
    );

    expect(namesIn(template)).toEqual([
      'copy',
      'separator',
      'Open link in browser',
      'Copy link address',
      'separator',
      'Copy image',
    ]);
  });

  it('offers Back and Forward on an empty spot, only when they can go somewhere', () => {
    const webContents = fakeWebContents({ canGoBack: true, canGoForward: false });
    const template = contextMenuTemplate(params(), webContents);

    expect(itemNamed(template, 'Back').enabled).toBe(true);
    expect(itemNamed(template, 'Forward').enabled).toBe(false);
    itemNamed(template, 'Back').click();
    expect(webContents.navigationHistory.goBack).toHaveBeenCalledTimes(1);
  });
});

describe('showContextMenuOnRightClick', () => {
  it('pops up the menu in the window that was clicked', () => {
    electron.buildFromTemplate.mockReturnValue({ popup: electron.popup });

    const webContents = fakeWebContents();

    showContextMenuOnRightClick(webContents);

    const [eventName, showMenu] = webContents.on.mock.calls[0];

    showMenu({}, params({ selectionText: 'Frieren' }));

    expect(eventName).toBe('context-menu');
    expect(electron.buildFromTemplate).toHaveBeenCalledWith([{ role: 'copy' }]);
    expect(electron.popup).toHaveBeenCalledWith({ window: 'the window' });
  });
});
