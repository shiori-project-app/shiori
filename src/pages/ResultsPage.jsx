import { useSearchParams } from 'react-router';
import { browseAnime } from '@/api/services/animeService';
import { BrowseFilters } from '@/components/anime/BrowseFilters';
import { FilteredResults } from '@/components/anime/FilteredResults';
import { LoadError } from '@/components/common/LoadError';
import { DEFAULT_SEARCH_PARAMS } from '@/constants/filters';
import { useAsync } from '@/hooks/useAsync';
import { useContentFilter } from '@/hooks/usePreferences';
import { readBrowseParams, toBrowseSearchParams } from '@/utils/browseParams';
import { formatTitleCount } from '@/utils/format';
import { FIRST_PAGE } from '@/utils/pagination';

const NO_RESULTS = { items: [], pageInfo: { total: 0, currentPage: 1, lastPage: 1 } };

export const ResultsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const query = (searchParams.get('q') || '').trim();
  const filterParams = readBrowseParams(searchParams, DEFAULT_SEARCH_PARAMS);

  const contentFilter = useContentFilter();

  const {
    data: results,
    error,
    loading,
    retry,
  } = useAsync(
    () => (query ? browseAnime({ ...filterParams, search: query }, contentFilter) : Promise.resolve(NO_RESULTS)),
    [query, filterParams, contentFilter],
  );

  const showResults = (nextParams) =>
    setSearchParams({ q: query, ...toBrowseSearchParams(nextParams, DEFAULT_SEARCH_PARAMS) });

  const changeFilters = (changes) => showResults({ ...filterParams, ...changes, page: FIRST_PAGE });

  const changePage = (page) => showResults({ ...filterParams, page });

  if (error) return <LoadError error={error} onRetry={retry} />;

  return (
    <>
      <h1 className="page-title">Results for “{query}”</h1>
      {results && <p className="page-count">{formatTitleCount(results.pageInfo)}</p>}
      <BrowseFilters filters={filterParams} defaults={DEFAULT_SEARCH_PARAMS} onChange={changeFilters} />

      <FilteredResults
        results={results}
        isLoading={loading}
        onPageChange={changePage}
        emptyTitle="No matches"
        emptyMessage="Try a different title, the Japanese or romaji name, or fewer filters."
      />
    </>
  );
};
