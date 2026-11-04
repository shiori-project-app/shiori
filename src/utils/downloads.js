import { twoDigits } from '@/utils/format';
import { MAX_NAME_LENGTH, safeName } from '@shared/fileNames';

export const showFolderLabel = (rootFolder, title) =>
  rootFolder ? `${rootFolder}\\${safeName(title)}` : safeName(title);

export const episodeFileName = (series, episodeNumber) => {
  const episodeSuffix = ` - ${twoDigits(episodeNumber)}.mp4`;

  const shortenedTitle = safeName(series.title)
    .slice(0, MAX_NAME_LENGTH - episodeSuffix.length)
    .trimEnd();

  return `${shortenedTitle}${episodeSuffix}`;
};
