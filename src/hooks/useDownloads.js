import { useContext } from 'react';
import { DownloadsContext, LiveDownloadsContext } from '@/context/DownloadsContext';

export const useDownloads = () => useContext(DownloadsContext);

export const useLiveDownloads = () => useContext(LiveDownloadsContext);
