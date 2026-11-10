import { useEffect, useRef, useState } from 'react';
import { NO_SKIP_PROMPT, nextSkipPrompt, skipPromptProgress, skipSegmentKey } from '@/utils/skipTimes';

export const useSkipPrompt = (segment, time) => {
  const [prompt, setPrompt] = useState(NO_SKIP_PROMPT);
  const lastSeenTime = useRef(null);

  const segmentKey = skipSegmentKey(segment);
  const hasNoPrompt = segmentKey === null && prompt.segmentKey === null;

  useEffect(() => {
    const previousTime = lastSeenTime.current;

    lastSeenTime.current = time;

    if (hasNoPrompt) return;

    setPrompt((currentPrompt) => nextSkipPrompt(currentPrompt, segmentKey, previousTime, time));
  }, [segmentKey, time, hasNoPrompt]);

  return skipPromptProgress(segment, prompt, time);
};
