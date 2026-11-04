import { NavLink } from 'react-router';
import { NAV_ITEMS, ROUTES } from '@/constants/routes';
import { useDownloads } from '@/hooks/useDownloads';
import { cx } from '@/utils/classNames';
import { isActive as isDownloadInProgress } from '@shared/downloadStates';

const ActiveDownloadsBadge = ({ count }) => (
  <span className="nav__badge" aria-label={`${count} in progress`}>
    <span className="nav__badge-count">{count}</span>
  </span>
);

export const Nav = () => {
  const { downloads } = useDownloads();

  const activeDownloadCount = downloads.filter(isDownloadInProgress).length;

  return (
    <nav className="nav" aria-label="Main">
      {NAV_ITEMS.map(({ to, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === ROUTES.home}
          className={({ isActive }) => cx('nav__link', isActive && 'is-active')}
        >
          {label}
          {to === ROUTES.downloads && activeDownloadCount > 0 && <ActiveDownloadsBadge count={activeDownloadCount} />}
        </NavLink>
      ))}
    </nav>
  );
};
