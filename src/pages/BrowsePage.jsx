import { useSearchParams } from 'react-router';
import { browseAnime } from '@/api/services/animeService';
import { BrowseFilters } from '@/components/anime/BrowseFilters';
import { FilteredResults } from '@/components/anime/FilteredResults';
import { LoadError } from '@/components/common/LoadError';
import { Footer } from '@/components/layout/Footer';
import { useAsync } from '@/hooks/useAsync';
import { useContentFilter } from '@/hooks/usePreferences';
import { readBrowseParams, toBrowseSearchParams } from '@/utils/browseParams';
import { formatTitleCount } from '@/utils/format';
import { FIRST_PAGE } from '@/utils/pagination';

export const BrowsePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const browseParams = readBrowseParams(searchParams);

  const contentFilter = useContentFilter();

  const {
    data: results,
    error,
    loading,
    retry,
  } = useAsync(() => browseAnime(browseParams, contentFilter), [browseParams, contentFilter]);

  const changeFilters = (changes) =>
    setSearchParams(toBrowseSearchParams({ ...browseParams, ...changes, page: FIRST_PAGE }));

  const changePage = (page) => setSearchParams(toBrowseSearchParams({ ...browseParams, page }));

  if (error) return <LoadError error={error} onRetry={retry} />;

  return (
    <>
      <h1 className="page-title">Browse</h1>
      {results && <p className="page-count">{formatTitleCount(results.pageInfo)}</p>}
      <BrowseFilters filters={browseParams} onChange={changeFilters} />

      <FilteredResults
        results={results}
        isLoading={loading}
        onPageChange={changePage}
        emptyTitle="Nothing here"
        emptyMessage="No titles match these filters."
      />

      {!loading && <Footer />}
    </>
  );
};
