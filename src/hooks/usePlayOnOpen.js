import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';

export const usePlayOnOpen = (play) => {
  const { pathname, search, state } = useLocation();
  const navigate = useNavigate();

  const shouldPlay = state?.playOnOpen === true;

  useEffect(() => {
    if (!shouldPlay) return;

    play();
    navigate({ pathname, search }, { replace: true, state: null });
  }, [shouldPlay, play, navigate, pathname, search]);
};
