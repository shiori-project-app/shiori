import { useCallback } from 'react';
import { useSearchParams } from 'react-router';

const NO_RESET_PARAMS = [];

export const useSearchParam = (name, fallbackValue, { replace = false, resetParams = NO_RESET_PARAMS } = {}) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const value = searchParams.get(name) ?? fallbackValue;

  const setValue = useCallback(
    (nextValue) =>
      setSearchParams(
        (previousParams) => {
          const nextParams = new URLSearchParams(previousParams);

          nextParams.set(name, String(nextValue));
          resetParams.forEach((resetParam) => nextParams.delete(resetParam));

          return nextParams;
        },
        { replace },
      ),
    [name, replace, resetParams, setSearchParams],
  );

  return [value, setValue];
};
