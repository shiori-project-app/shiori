import { useState } from 'react';
import { fetchHomeLists } from '@/api/services/animeService';
import { PosterGrid } from '@/components/anime/PosterGrid';
import { Section } from '@/components/anime/Section';
import { LoadError } from '@/components/common/LoadError';
import { Tabs } from '@/components/common/Tabs';
import { HomeListsSkeleton } from '@/components/home/HomeSkeletons';
import { MiniList } from '@/components/home/MiniList';
import { TopTrending } from '@/components/home/TopTrending';
import { browsePath } from '@/constants/routes';
import { useAsync } from '@/hooks/useAsync';
import { useContentFilter } from '@/hooks/usePreferences';

const DISCOVER_TABS = [
  { id: 'newest', label: 'Newest', sort: 'START_DATE_DESC' },
  { id: 'popular', label: 'Popular', sort: 'POPULARITY_DESC' },
  { id: 'topRated', label: 'Top rated', sort: 'SCORE_DESC' },
];

const HOME_MINI_LISTS = [
  { key: 'topAiring', title: 'Top Airing', browseFilters: { status: 'RELEASING', sort: 'SCORE_DESC' } },
  { key: 'upcoming', title: 'Upcoming', browseFilters: { status: 'NOT_YET_RELEASED', sort: 'POPULARITY_DESC' } },
  { key: 'topMovies', title: 'Top Movies', browseFilters: { format: 'MOVIE', sort: 'SCORE_DESC' } },
  { key: 'justFinished', title: 'Just Finished', browseFilters: { status: 'FINISHED', sort: 'END_DATE_DESC' } },
];

export const HomeLists = () => {
  const contentFilter = useContentFilter();
  const { data: homeLists, error, loading, retry } = useAsync(() => fetchHomeLists(contentFilter), [contentFilter]);

  const [discoverTabId, setDiscoverTabId] = useState('newest');

  if (error) return <LoadError error={error} onRetry={retry} />;
  if (loading) return <HomeListsSkeleton />;

  const discoverTab = DISCOVER_TABS.find((tab) => tab.id === discoverTabId);

  return (
    <>
      <div className="home-split">
        <Section title="Discover" moreTo={browsePath({ sort: discoverTab.sort })}>
          <Tabs tabs={DISCOVER_TABS} value={discoverTabId} onChange={setDiscoverTabId} label="Discover" />
          <PosterGrid items={homeLists[discoverTabId]} />
        </Section>

        <TopTrending />
      </div>

      <div className="home-lists">
        {HOME_MINI_LISTS.map(({ key, title, browseFilters }) => (
          <MiniList key={key} title={title} items={homeLists[key]} moreTo={browsePath(browseFilters)} />
        ))}
      </div>
    </>
  );
};
