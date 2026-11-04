import { usePreferences } from '@/hooks/usePreferences';
import { otherTitles } from '@/utils/titles';

export const AlternativeTitles = ({ series, limit }) => {
  const { titleLanguage } = usePreferences();

  const alternativeTitles = otherTitles(series, titleLanguage).slice(0, limit);

  if (!alternativeTitles.length) return null;

  return (
    <div className="jp-title" lang={alternativeTitles[0] === series.nativeTitle ? 'ja' : undefined}>
      {alternativeTitles.join(' · ')}
    </div>
  );
};
