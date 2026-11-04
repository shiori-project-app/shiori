import { describe, expect, it } from 'vitest';
import { resumablePosition, segmentMarksGradient } from '@/utils/player';

describe('segmentMarksGradient', () => {
  it('colours the intro and ending on the seek bar', () => {
    const segments = [
      { type: 'intro', start: 60, end: 150 },
      { type: 'ending', start: 1290, end: 1380 },
    ];

    const gradient = segmentMarksGradient(segments, 1500);

    expect(gradient).toContain('transparent 4%, rgb(250 204 21 / 0.9) 4%, rgb(250 204 21 / 0.9) 10%, transparent 10%');

    expect(gradient).toContain(
      'transparent 86%, rgb(250 204 21 / 0.9) 86%, rgb(250 204 21 / 0.9) 92%, transparent 92%',
    );
  });

  it('draws nothing without segments or before the length is known', () => {
    expect(segmentMarksGradient([], 1500)).toBe('none');
    expect(segmentMarksGradient([{ type: 'intro', start: 60, end: 150 }], 0)).toBe('none');
  });
});

describe('resumablePosition', () => {
  it('only resumes from the middle of an episode', () => {
    expect(resumablePosition(3, 1500)).toBeNull();
    expect(resumablePosition(600.7, 1500)).toBe(600);
    expect(resumablePosition(1480, 1500)).toBeNull();
  });
});
