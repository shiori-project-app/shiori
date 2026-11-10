import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SKIP_PROMPT_SECONDS } from '@/config/app.config';
import { useSkipSegments } from '@/hooks/useSkipSegments';

const fetchSkipTimes = vi.hoisted(() => vi.fn());

vi.mock('@/api/services/skipService', () => ({ fetchSkipTimes }));

const INTRO = { type: 'intro', start: 60, end: 150 };
const ENDING = { type: 'ending', start: 1300, end: 1390 };

const ANISKIP_TYPES = { intro: 'op', ending: 'ed' };

const asAniSkipSubmission = ({ type, start, end }) => ({
  skipType: ANISKIP_TYPES[type],
  interval: { startTime: start, endTime: end },
  episodeLength: 1440,
});

const seek = vi.fn();

const renderSkipSegments = async (initialTime) => {
  const hook = renderHook(
    ({ time }) => useSkipSegments({ malId: 1, episode: 1, duration: 1440, time, playing: true, seek, auto: false }),
    { initialProps: { time: initialTime } },
  );

  await waitFor(() => expect(hook.result.current.segments).toHaveLength(2));

  return {
    result: hook.result,
    moveTo: (time) => hook.rerender({ time }),
  };
};

const promptOf = (result) => ({
  isPrompting: result.current.isPrompting,
  promptRemaining: Number(result.current.promptRemaining.toFixed(3)),
});

describe('useSkipSegments prompt', () => {
  beforeEach(() => {
    fetchSkipTimes.mockReset();
    fetchSkipTimes.mockResolvedValue([INTRO, ENDING].map(asAniSkipSubmission));
  });

  afterEach(cleanup);

  it('prompts for the first few seconds of video time in a segment, draining as it goes', async () => {
    const { result, moveTo } = await renderSkipSegments(0);

    expect(promptOf(result)).toEqual({ isPrompting: false, promptRemaining: 0 });

    moveTo(INTRO.start);
    expect(promptOf(result)).toEqual({ isPrompting: true, promptRemaining: 1 });

    moveTo(INTRO.start + SKIP_PROMPT_SECONDS / 2);
    expect(promptOf(result)).toEqual({ isPrompting: true, promptRemaining: 0.5 });

    moveTo(INTRO.start + SKIP_PROMPT_SECONDS);
    expect(promptOf(result)).toEqual({ isPrompting: false, promptRemaining: 0 });
    expect(result.current.segment.type).toBe('intro');
  });

  it('counts the prompt from where playback entered, not from the segment start', async () => {
    const { result, moveTo } = await renderSkipSegments(0);

    moveTo(INTRO.start + 40);
    expect(promptOf(result)).toEqual({ isPrompting: true, promptRemaining: 1 });

    moveTo(INTRO.start + 40 + SKIP_PROMPT_SECONDS);
    expect(result.current.isPrompting).toBe(false);
  });

  it('holds still while video time does, as when paused or buffering', async () => {
    const { result, moveTo } = await renderSkipSegments(0);

    moveTo(INTRO.start);
    moveTo(INTRO.start + 2);

    const heldPrompt = promptOf(result);

    moveTo(INTRO.start + 2);
    expect(promptOf(result)).toEqual(heldPrompt);
  });

  it('follows a forward seek inside the prompt, so the bar and the prompt end together', async () => {
    const { result, moveTo } = await renderSkipSegments(0);

    moveTo(INTRO.start);
    moveTo(INTRO.start + 4.5);
    expect(promptOf(result)).toEqual({ isPrompting: true, promptRemaining: 0.25 });

    moveTo(INTRO.start + SKIP_PROMPT_SECONDS);
    expect(promptOf(result)).toEqual({ isPrompting: false, promptRemaining: 0 });
  });

  it('starts over after seeking back, including back to exactly where the prompt began', async () => {
    const { result, moveTo } = await renderSkipSegments(0);

    moveTo(INTRO.start);
    moveTo(INTRO.start + 4);
    moveTo(INTRO.start);
    expect(promptOf(result)).toEqual({ isPrompting: true, promptRemaining: 1 });

    moveTo(INTRO.start + 30);
    expect(result.current.isPrompting).toBe(false);

    moveTo(INTRO.start + 10);
    expect(promptOf(result)).toEqual({ isPrompting: true, promptRemaining: 1 });
  });

  it('treats a step back under a second as playback jitter, keeping the bar in step with time', async () => {
    const { result, moveTo } = await renderSkipSegments(0);

    moveTo(INTRO.start);
    moveTo(INTRO.start + 3);
    moveTo(INTRO.start + 2.4);

    expect(promptOf(result)).toEqual({ isPrompting: true, promptRemaining: 0.6 });
  });

  it('prompts again for the next segment and after leaving and coming back', async () => {
    const { result, moveTo } = await renderSkipSegments(0);

    moveTo(INTRO.start + 30);
    moveTo(ENDING.start + 1);
    expect(result.current.segment.type).toBe('ending');
    expect(result.current.isPrompting).toBe(true);

    moveTo(500);
    expect(promptOf(result)).toEqual({ isPrompting: false, promptRemaining: 0 });

    moveTo(INTRO.start + 30);
    expect(result.current.isPrompting).toBe(true);
  });

  it('shortens the prompt to what’s left of the segment, so the bar empties as the button goes', async () => {
    const shownUntil = INTRO.end - 0.5;
    const { result, moveTo } = await renderSkipSegments(0);

    moveTo(shownUntil - 3);
    expect(promptOf(result)).toEqual({ isPrompting: true, promptRemaining: 1 });

    moveTo(shownUntil - 1.5);
    expect(promptOf(result)).toEqual({ isPrompting: true, promptRemaining: 0.5 });

    moveTo(shownUntil - 0.01);
    expect(result.current.isPrompting).toBe(true);
    expect(result.current.promptRemaining).toBeLessThan(0.01);

    moveTo(shownUntil);
    expect(result.current.segment).toBeNull();
  });

  it('keeps the same result object between ticks outside a prompt, so the button doesn’t re-render', async () => {
    const { result, moveTo } = await renderSkipSegments(0);

    moveTo(INTRO.start);
    moveTo(INTRO.start + SKIP_PROMPT_SECONDS + 1);

    const afterPrompt = result.current;

    moveTo(INTRO.start + SKIP_PROMPT_SECONDS + 2);
    expect(result.current).toBe(afterPrompt);
  });
});
