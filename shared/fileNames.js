export const MAX_NAME_LENGTH = 120;
const FALLBACK_NAME = 'Untitled';
// oxlint-disable-next-line no-control-regex
const CHARACTERS_WINDOWS_FORBIDS = /[<>:"/\\|?*\u0000-\u001f]/g;
const ENDING_WINDOWS_CANNOT_ADDRESS = /[. ]+$/;

export const withoutUnsafeNameEnding = (name) => name.replace(ENDING_WINDOWS_CANNOT_ADDRESS, '');

export const safeName = (name) =>
  withoutUnsafeNameEnding(
    String(name).replace(CHARACTERS_WINDOWS_FORBIDS, '').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME_LENGTH),
  ) || FALLBACK_NAME;
