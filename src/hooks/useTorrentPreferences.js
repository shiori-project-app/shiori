import { DEFAULT_TORRENT_PREFERENCES } from '@/constants/torrents';
import { usePersistentState } from '@/hooks/usePersistentState';

export const useTorrentPreferences = () => usePersistentState('torrent-preferences', DEFAULT_TORRENT_PREFERENCES);
