import { ANILIST_SITE_URL } from '@/config/api.config';
import { useToast } from '@/hooks/useToast';

export const useShareSeriesLink = (seriesId) => {
  const showToast = useToast();

  return () => {
    const seriesUrl = `${ANILIST_SITE_URL}/anime/${seriesId}`;

    navigator.clipboard.writeText(seriesUrl).then(
      () => showToast('Link copied'),
      () => showToast(`Copy this link: ${seriesUrl}`),
    );
  };
};
