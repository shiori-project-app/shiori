import { forgetAniListResponses } from '@/api/clients/anilistClient';
import { clearAniListData, clearSubtitleCache, getCacheUsage } from '@/api/clients/desktopClient';
import { forgetEpisodeTitles } from '@/api/services/episodeService';
import { forgetWatchOrders } from '@/api/services/franchiseService';
import { resetOfflineStore } from '@/api/services/offlineStore';
import { forgetPrequelChains } from '@/api/services/seasonService';
import { forgetLoadedSeries } from '@/api/services/seriesRegistry';
import { forgetSkipTimes } from '@/api/services/skipService';

export const fetchCacheUsage = () => getCacheUsage();

export const clearSubtitles = () => clearSubtitleCache();

export const clearSavedAniListData = async () => {
  await clearAniListData();
  forgetAniListResponses();
  forgetLoadedSeries();
  forgetEpisodeTitles();
  forgetWatchOrders();
  forgetPrequelChains();
  forgetSkipTimes();
  resetOfflineStore();
};
