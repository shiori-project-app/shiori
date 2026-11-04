export const PREFERENCES_KEY = 'preferences';

export const TITLE_LANGUAGES = [
  { id: 'english', label: 'English' },
  { id: 'romaji', label: 'Romaji' },
  { id: 'native', label: 'Japanese' },
];

export const CLEANUP_ACTIONS = { trash: 'trash', move: 'move' };

export const cleanupActionOptions = (trashName) => [
  { id: CLEANUP_ACTIONS.trash, label: trashName },
  { id: CLEANUP_ACTIONS.move, label: 'Move to a folder' },
];

export const CLEANUP_AFTER_DAYS_OPTIONS = [7, 14, 30, 60, 90];

export const DEFAULT_PREFERENCES = {
  titleLanguage: 'english',
  hideEcchi: false,
  hideSpoilers: false,
  autoSkip: false,
  reduceMotion: false,
  cleanupAfterDays: 30,
  cleanupAction: CLEANUP_ACTIONS.trash,
};
