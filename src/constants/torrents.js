export const RESOLUTION_OPTIONS = [
  ['any', 'Any'],
  ['1080', '1080p'],
  ['720', '720p'],
  ['480', '480p'],
];

export const AUDIO_OPTIONS = [
  ['any', 'Any (usually Japanese + subs)'],
  ['dub', 'English dub (dual audio)'],
];

export const DEFAULT_TORRENT_PREFERENCES = { resolution: '1080', audio: 'any' };

export const SUBSPLEASE_RESOLUTIONS = ['1080', '720', '480'];

export const SUBSPLEASE_RESOLUTION_OPTIONS = SUBSPLEASE_RESOLUTIONS.map((resolution) => [resolution, `${resolution}p`]);
