import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SKIP_PROMPT_SECONDS } from '@/config/app.config';
import { useSkipPrompt } from '@/hooks/useSkipPrompt';

const INTRO = { type: 'intro', start: 60, end: 150 };

const renderPrompt = () => {
  const hook = renderHook(({ segment, time }) => useSkipPrompt(segment, time), {
    initialProps: { segment: null, time: 0 },
  });

  return { result: hook.result, moveTo: (segment, time) => hook.rerender({ segment, time }) };
};

describe('useSkipPrompt', () => {
  afterEach(cleanup);

  it('prompts from entering a segment and stops after the prompt time', () => {
    const { result, moveTo } = renderPrompt();

    expect(result.current).toEqual({ isPrompting: false, promptRemaining: 0 });

    moveTo(INTRO, 70);
    expect(result.current).toEqual({ isPrompting: true, promptRemaining: 1 });

    moveTo(INTRO, 70 + SKIP_PROMPT_SECONDS);
    expect(result.current.isPrompting).toBe(false);
  });

  it('starts over after seeking back within the segment', () => {
    const { result, moveTo } = renderPrompt();

    moveTo(INTRO, 70);
    moveTo(INTRO, 90);
    moveTo(INTRO, 80);

    expect(result.current).toEqual({ isPrompting: true, promptRemaining: 1 });
  });
});
