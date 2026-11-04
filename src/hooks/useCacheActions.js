import { useState } from 'react';
import { clearSavedAniListData, clearSubtitles, fetchCacheUsage } from '@/api/services/cacheService';
import { useAsync } from '@/hooks/useAsync';
import { useToast } from '@/hooks/useToast';

export const CACHES = { subtitles: 'subtitles', anilist: 'anilist' };

const CLEAR_ACTIONS = {
  [CACHES.subtitles]: { clear: clearSubtitles, doneMessage: 'Subtitle cache cleared' },

  [CACHES.anilist]: {
    clear: clearSavedAniListData,
    doneMessage: 'Saved AniList data cleared. Shiori saves your shows again in the background.',
  },
};

export const useCacheActions = () => {
  const showToast = useToast();

  const [usageVersion, setUsageVersion] = useState(0);
  const [clearingCache, setClearingCache] = useState(null);

  const usage = useAsync(fetchCacheUsage, [usageVersion]);

  const clearCache = async (cacheName) => {
    const { clear, doneMessage } = CLEAR_ACTIONS[cacheName];

    setClearingCache(cacheName);

    try {
      await clear();
      showToast(doneMessage);
    } catch (error) {
      showToast(`Couldn’t clear the cache: ${error.message}`);
    } finally {
      setClearingCache(null);
      setUsageVersion((version) => version + 1);
    }
  };

  return { usage: usage.data ?? null, clearingCache, clearCache };
};
