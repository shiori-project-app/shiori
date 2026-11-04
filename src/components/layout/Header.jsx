import { NavLink, useNavigate } from 'react-router';
import { fetchRandomSeries } from '@/api/services/animeService';
import { Icon } from '@/components/common/Icon';
import { Logo } from '@/components/layout/Logo';
import { Nav } from '@/components/layout/Nav';
import { SearchBar } from '@/components/layout/SearchBar';
import { ROUTES, seriesPath } from '@/constants/routes';
import { useContentFilter } from '@/hooks/usePreferences';
import { useToast } from '@/hooks/useToast';
import { cx } from '@/utils/classNames';

const SurpriseMeButton = () => {
  const contentFilter = useContentFilter();
  const navigate = useNavigate();
  const showToast = useToast();

  const openRandomSeries = async () => {
    try {
      const randomSeries = await fetchRandomSeries(contentFilter);

      navigate(seriesPath(randomSeries.id));
    } catch {
      showToast('Couldn’t reach AniList');
    }
  };

  return (
    <button type="button" className="btn btn--sm header__random" onClick={openRandomSeries}>
      <Icon name="dice" />
      <span>Surprise me</span>
    </button>
  );
};

export const Header = () => (
  <header className="header">
    <Logo />
    <Nav />
    <SearchBar />
    <SurpriseMeButton />

    <NavLink
      to={ROUTES.settings}
      className={({ isActive }) => cx('header__settings', isActive && 'is-active')}
      aria-label="Settings"
      title="Settings"
    >
      <Icon name="settings" />
    </NavLink>
  </header>
);
