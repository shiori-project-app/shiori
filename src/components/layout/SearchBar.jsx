import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Icon } from '@/components/common/Icon';
import { resultsPath } from '@/constants/routes';
import { useOutsideClick } from '@/hooks/useOutsideClick';
import { MIN_SUGGESTION_QUERY_LENGTH, useSearchSuggestions } from '@/hooks/useSearchSuggestions';

const SearchSuggestions = ({ suggestions, onPick }) => (
  <div className="search__suggestions" id="search-suggestions">
    {suggestions.map((title) => (
      <button key={title} type="button" className="search__suggestion" onClick={() => onPick(title)}>
        <Icon name="search" />
        <span>{title}</span>
      </button>
    ))}
  </div>
);

export const SearchBar = () => {
  const navigate = useNavigate();

  const searchRootRef = useRef(null);
  const [query, setQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const suggestions = useSearchSuggestions(query);

  const stopTyping = useCallback(() => setIsTyping(false), []);

  useOutsideClick(searchRootRef, isTyping, stopTyping);

  const searchFor = (text) => {
    setQuery(text);
    setIsTyping(false);
    navigate(resultsPath(text));
  };

  const submitSearch = (event) => {
    event.preventDefault();

    const trimmedQuery = query.trim();

    if (trimmedQuery) searchFor(trimmedQuery);
  };

  const updateQuery = (event) => {
    setQuery(event.target.value);
    setIsTyping(true);
  };

  const showSuggestions = isTyping && query.trim().length >= MIN_SUGGESTION_QUERY_LENGTH && suggestions.length > 0;

  return (
    <div className="search" ref={searchRootRef}>
      <form className="search__form" role="search" autoComplete="off" onSubmit={submitSearch}>
        <label className="sr-only" htmlFor="search-input">
          Search anime
        </label>

        <input
          id="search-input"
          className="search__input"
          type="text"
          placeholder="Search anime"
          aria-controls="search-suggestions"
          value={query}
          onChange={updateQuery}
        />

        <button type="submit" className="search__submit" aria-label="Search">
          <Icon name="search" />
        </button>
      </form>

      {showSuggestions && <SearchSuggestions suggestions={suggestions} onPick={searchFor} />}
    </div>
  );
};
