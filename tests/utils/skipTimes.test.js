import { describe, expect, it } from 'vitest';
import { fitSkipTimes, reachedByPlaying, segmentAt } from '@/utils/skipTimes';

const frieren = [
  { interval: { startTime: 153.6, endTime: 243.5 }, skipType: 'op', episodeLength: 1470.1 },
  { interval: { startTime: 1370, endTime: 1460 }, skipType: 'ed', episodeLength: 1470 },
];

describe('fitSkipTimes', () => {
  it('uses the times as they are for a file of the same length', () => {
    expect(fitSkipTimes(frieren, 1470)).toEqual([
      { type: 'intro', start: 153.6, end: 243.5 },
      { type: 'ending', start: 1370, end: 1460 },
    ]);
  });

  it('keeps the intro and moves the ending for a shorter file (the ending sits a fixed distance from the end)', () => {
    const segments = fitSkipTimes(frieren, 1450);

    expect(segments[0]).toEqual({ type: 'intro', start: 153.6, end: 243.5 });
    expect(segments[1].type).toBe('ending');
    expect(segments[1].start).toBeCloseTo(1350);
    expect(segments[1].end).toBeCloseTo(1440);
  });

  it('ignores submissions made on a much longer or shorter file (another cut)', () => {
    expect(fitSkipTimes(frieren, 1420)).toEqual([]);
  });

  it('keeps one segment per type, the closest match, and drops unknown or tiny ones', () => {
    const results = [
      { interval: { startTime: 100, endTime: 190 }, skipType: 'op', episodeLength: 1480 },
      { interval: { startTime: 98, endTime: 188 }, skipType: 'mixed-op', episodeLength: 1471 },
      { interval: { startTime: 10, endTime: 12 }, skipType: 'recap', episodeLength: 1470 },
      { interval: { startTime: 300, endTime: 400 }, skipType: 'preview', episodeLength: 1470 },
    ];

    expect(fitSkipTimes(results, 1470)).toEqual([{ type: 'intro', start: 98, end: 188 }]);
  });

  it('clamps segments to the file', () => {
    const results = [{ interval: { startTime: 1400, endTime: 1475 }, skipType: 'ed', episodeLength: 1470 }];

    expect(fitSkipTimes(results, 1470)).toEqual([{ type: 'ending', start: 1400, end: 1470 }]);
  });
});

describe('segmentAt', () => {
  const segments = [{ type: 'intro', start: 60, end: 150 }];

  it('finds the segment playing now, not in its last half second', () => {
    expect(segmentAt(segments, 59)).toBeNull();
    expect(segmentAt(segments, 60)?.type).toBe('intro');
    expect(segmentAt(segments, 149.4)?.type).toBe('intro');
    expect(segmentAt(segments, 149.6)).toBeNull();
  });
});

describe('fitSkipTimes, review fixes', () => {
  it('ranks a submission without a length after ones with a known length, and never shifts it', () => {
    const results = [
      { interval: { startTime: 1370, endTime: 1460 }, skipType: 'ed', episodeLength: 0 },
      { interval: { startTime: 1370, endTime: 1460 }, skipType: 'ed', episodeLength: 1470 },
    ];

    expect(fitSkipTimes(results, 1450)).toEqual([{ type: 'ending', start: 1350, end: 1440 }]);
    expect(fitSkipTimes([results[0]], 1450)).toEqual([{ type: 'ending', start: 1370, end: 1450 }]);
  });

  it('shifts by type, not position: an early ending moves, a late intro stays', () => {
    const results = [
      { interval: { startTime: 500, endTime: 590 }, skipType: 'ed', episodeLength: 1470 },
      { interval: { startTime: 1000, endTime: 1090 }, skipType: 'op', episodeLength: 1470 },
    ];

    expect(fitSkipTimes(results, 1450)).toEqual([
      { type: 'ending', start: 480, end: 570 },
      { type: 'intro', start: 1000, end: 1090 },
    ]);
  });
});

describe('reachedByPlaying', () => {
  const intro = { type: 'intro', start: 60, end: 150 };

  it('is true when playback plays on into the segment', () => {
    expect(reachedByPlaying(intro, 59.8, 60.05)).toBe(true);
    expect(reachedByPlaying({ type: 'intro', start: 0, end: 90 }, 0, 0.3)).toBe(true);
  });

  it('is false for a seek into it, or the first update after opening the episode there', () => {
    expect(reachedByPlaying(intro, 30, 100)).toBe(false);
    expect(reachedByPlaying(intro, 200, 100)).toBe(false);
    expect(reachedByPlaying(intro, null, 100)).toBe(false);
  });
});
