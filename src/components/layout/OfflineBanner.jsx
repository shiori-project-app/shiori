import { Icon } from '@/components/common/Icon';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export const OfflineBanner = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="offline-banner" role="status">
      <Icon name="wifi-off" />

      <span>
        <b>You’re offline.</b> Saved shows, downloads and notes still work; browsing and search come back when you
        reconnect.
      </span>
    </div>
  );
};
