import { BrowserWindow, clipboard, Menu, shell } from 'electron';
import { isWebUrl } from './webUrls.js';

const SEPARATOR = { type: 'separator' };

const withSeparatorsBetween = (groups) =>
  groups
    .filter((group) => group.length > 0)
    .flatMap((group, groupIndex) => (groupIndex > 0 ? [SEPARATOR, ...group] : group));

const textBoxGroups = ({ dictionarySuggestions, editFlags }, webContents) => [
  dictionarySuggestions.map((word) => ({ label: word, click: () => webContents.replaceMisspelling(word) })),

  [
    { role: 'undo', enabled: editFlags.canUndo },
    { role: 'redo', enabled: editFlags.canRedo },
  ],

  [
    { role: 'cut', enabled: editFlags.canCut },
    { role: 'copy', enabled: editFlags.canCopy },
    { role: 'paste', enabled: editFlags.canPaste },
  ],

  [{ role: 'selectAll', enabled: editFlags.canSelectAll }],
];

const linkItems = ({ linkURL }) =>
  isWebUrl(linkURL)
    ? [
        { label: 'Open link in browser', click: () => shell.openExternal(linkURL) },
        { label: 'Copy link address', click: () => clipboard.writeText(linkURL) },
      ]
    : [];

const imageItems = ({ mediaType, hasImageContents, x, y }, webContents) =>
  mediaType === 'image' && hasImageContents
    ? [{ label: 'Copy image', click: () => webContents.copyImageAt(x, y) }]
    : [];

const selectedTextItems = ({ selectionText }) => (selectionText.trim() ? [{ role: 'copy' }] : []);

const pageGroups = (params, webContents) => [
  selectedTextItems(params),
  linkItems(params),
  imageItems(params, webContents),
];

const navigationItems = ({ navigationHistory }) => [
  { label: 'Back', enabled: navigationHistory.canGoBack(), click: () => navigationHistory.goBack() },
  { label: 'Forward', enabled: navigationHistory.canGoForward(), click: () => navigationHistory.goForward() },
];

export const contextMenuTemplate = (params, webContents) => {
  if (params.isEditable) return withSeparatorsBetween(textBoxGroups(params, webContents));

  const pageItems = withSeparatorsBetween(pageGroups(params, webContents));

  return pageItems.length > 0 ? pageItems : navigationItems(webContents);
};

export const showContextMenuOnRightClick = (webContents) => {
  webContents.on('context-menu', (_event, params) => {
    const menu = Menu.buildFromTemplate(contextMenuTemplate(params, webContents));

    menu.popup({ window: BrowserWindow.fromWebContents(webContents) });
  });
};
