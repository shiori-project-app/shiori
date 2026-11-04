import { Link } from 'react-router';
import { EmptyState } from '@/components/common/EmptyState';
import { ROUTES } from '@/constants/routes';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export const OfflineNotice = ({ children }) => (
  <EmptyState
    title="You’re offline"
    action={
      <div className="cta cta--center">
        <Link className="btn btn--primary" to={ROUTES.myList}>
          My List
        </Link>

        <Link className="btn" to={ROUTES.downloads}>
          Downloads
        </Link>
      </div>
    }
  >
    {children} Your saved shows, downloaded episodes and notes still work.
  </EmptyState>
);

export const OnlineOnly = ({ description, children }) => {
  const isOnline = useOnlineStatus();

  return isOnline ? children : <OfflineNotice>{description}</OfflineNotice>;
};
