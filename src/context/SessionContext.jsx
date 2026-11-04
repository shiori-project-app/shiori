import { createContext, useMemo, useState } from 'react';

export const SessionContext = createContext(null);

export const SessionProvider = ({ children }) => {
  const [theater, setTheater] = useState(false);
  const [episodeBlocks, setEpisodeBlocks] = useState({});

  const actions = useMemo(
    () => ({
      toggleTheater: () => setTheater((isTheater) => !isTheater),
      setEpisodeBlock: (seriesId, block) => setEpisodeBlocks((blocks) => ({ ...blocks, [seriesId]: block })),
    }),
    [],
  );

  const value = useMemo(() => ({ theater, episodeBlocks, ...actions }), [theater, episodeBlocks, actions]);

  return <SessionContext value={value}>{children}</SessionContext>;
};
