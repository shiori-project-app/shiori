import { EmptyState } from '@/components/common/EmptyState';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

const OFFLINE_MESSAGE = 'This hasn’t been saved for offline use yet. Reconnect and try again.';

export const LoadError = ({ error, onRetry }) => {
  const isOnline = useOnlineStatus();

  return (
    <EmptyState
      title={isOnline ? 'Couldn’t load data' : 'You’re offline'}
      action={
        <button type="button" className="btn btn--primary" onClick={onRetry}>
          Retry
        </button>
      }
    >
      {isOnline ? `${error?.message || 'Network error'} Check your connection and try again.` : OFFLINE_MESSAGE}
    </EmptyState>
  );
};
