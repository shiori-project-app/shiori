import { Link } from 'react-router';
import { EmptyState } from '@/components/common/EmptyState';
import { ROUTES } from '@/constants/routes';

export const NotFound = () => (
  <EmptyState
    title="Not found"
    action={
      <Link className="btn btn--primary" to={ROUTES.home}>
        Back home
      </Link>
    }
  >
    We couldn’t find that title.
  </EmptyState>
);
