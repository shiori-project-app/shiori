import { UPDATE_PHASES } from '@shared/updatePhases';

const STATUS_TEXT_BY_PHASE = {
  [UPDATE_PHASES.unsupported]: () => 'Updates only work in an installed copy of Shiori.',
  [UPDATE_PHASES.idle]: () => 'Shiori checks GitHub for new versions each time it opens.',
  [UPDATE_PHASES.checking]: () => 'Checking for updates…',
  [UPDATE_PHASES.upToDate]: () => 'You’re on the latest version.',
  [UPDATE_PHASES.available]: ({ availableVersion }) => `Version ${availableVersion} is available.`,

  [UPDATE_PHASES.downloading]: ({ availableVersion, downloadPercent }) =>
    `Downloading version ${availableVersion}: ${downloadPercent}%`,

  [UPDATE_PHASES.ready]: ({ availableVersion }) =>
    `Version ${availableVersion} is ready. It installs when you restart or quit Shiori.`,

  [UPDATE_PHASES.failed]: () => 'The update didn’t work. Check your connection and try again.',
};

export const updateStatusText = (update) => STATUS_TEXT_BY_PHASE[update.phase](update);

export const updateAvailableMessage = ({ availableVersion }) =>
  `Shiori ${availableVersion} is available. Download it from Settings → Updates.`;

export const updateReadyMessage = ({ availableVersion }) =>
  `Shiori ${availableVersion} is ready. Restart from Settings → Updates, or it installs when you quit.`;
