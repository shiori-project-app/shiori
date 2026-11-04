import { useEffect, useState } from 'react';
import { fetchSuggestions } from '@/api/services/animeService';
import { SUGGEST_DEBOUNCE_MS } from '@/config/app.config';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useContentFilter } from '@/hooks/usePreferences';

export const MIN_SUGGESTION_QUERY_LENGTH = 2;

export const useSearchSuggestions = (query) => {
  const [suggestions, setSuggestions] = useState([]);

  const debouncedQuery = useDebouncedValue(query.trim(), SUGGEST_DEBOUNCE_MS);
  const contentFilter = useContentFilter();

  useEffect(() => {
    if (debouncedQuery.length < MIN_SUGGESTION_QUERY_LENGTH) return;

    let isLatestRequest = true;

    fetchSuggestions(debouncedQuery, contentFilter)
      .then((titles) => isLatestRequest && setSuggestions(titles))
      .catch(() => isLatestRequest && setSuggestions([]));

    return () => {
      isLatestRequest = false;
    };
  }, [debouncedQuery, contentFilter]);

  return suggestions;
};
