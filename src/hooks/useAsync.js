import { useCallback, useEffect, useState } from 'react';

export const useAsync = (load, dependencies) => {
  const [attempt, setAttempt] = useState(0);

  const requestKey = JSON.stringify([dependencies, attempt]);

  const [result, setResult] = useState({ requestKey: null });

  useEffect(() => {
    let isLatestRequest = true;

    load().then(
      (data) => isLatestRequest && setResult({ requestKey, data, error: null }),
      (error) => isLatestRequest && setResult({ requestKey, data: undefined, error }),
    );

    return () => {
      isLatestRequest = false;
    };
  }, [requestKey]);

  const retry = useCallback(() => setAttempt((previousAttempt) => previousAttempt + 1), []);

  const isSettled = result.requestKey === requestKey;

  return {
    data: isSettled ? result.data : undefined,
    error: isSettled ? result.error : null,
    loading: !isSettled,
    retry,
  };
};
