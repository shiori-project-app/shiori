import { describe, expect, it } from 'vitest';
import { withEpisodesHandled, withQueuedCheck } from '@/utils/trackingSchedule';

describe('withQueuedCheck', () => {
  const fullCheck = { onlySeriesId: undefined, justSavedEntries: {} };

  const showCheck = (onlySeriesId, justSavedEntries = {}) => ({ onlySeriesId, justSavedEntries });

  it('queues checks of different shows in order', () => {
    expect(withQueuedCheck([showCheck(1)], showCheck(2))).toEqual([showCheck(1), showCheck(2)]);
  });

  it('keeps only the newest request for one show, with its latest saved entry', () => {
    const newest = showCheck(1, { 1: { source: 'nyaa' } });

    expect(withQueuedCheck([showCheck(1)], newest)).toEqual([newest]);
  });

  it('lets a full check replace single-show checks, since it covers them', () => {
    expect(withQueuedCheck([showCheck(1), showCheck(2)], fullCheck)).toEqual([fullCheck]);
  });

  it('ignores anything else while a full check is already queued', () => {
    expect(withQueuedCheck([fullCheck], showCheck(1))).toEqual([fullCheck]);
    expect(withQueuedCheck([fullCheck], fullCheck)).toEqual([fullCheck]);
  });
});

describe('withEpisodesHandled', () => {
  it('adds episodes without repeating any, and keeps the rest of the entry', () => {
    expect(withEpisodesHandled({ title: 'Frieren', handled: [1, 2] }, [2, 3])).toEqual({
      title: 'Frieren',
      handled: [1, 2, 3],
    });
  });
});
