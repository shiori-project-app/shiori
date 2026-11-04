const languageDisplayNames = new Intl.DisplayNames(['en'], { type: 'language' });
const UNDETERMINED_LANGUAGE = 'und';

export const languageName = (languageCode) => {
  if (!languageCode || languageCode === UNDETERMINED_LANGUAGE) return null;

  try {
    const name = languageDisplayNames.of(languageCode);

    return name && name !== languageCode ? name : languageCode;
  } catch {
    return languageCode;
  }
};
