import { describe, expect, it } from 'vitest';
import { downloadPercent, downloadStatusText, queueSummary } from '@/utils/downloadStatus';

const MEGABYTE = 1024 ** 2;

describe('download status', () => {
  it('describes each state', () => {
    expect(downloadStatusText({ state: 'queued', received: 0 })).toBe('Waiting');
    expect(downloadStatusText({ state: 'downloading', received: 0, total: 0 })).toBe('Starting…');

    expect(
      downloadStatusText({ state: 'downloading', received: 50 * MEGABYTE, total: 200 * MEGABYTE, speed: 2 * MEGABYTE }),
    ).toBe('25% · 50.0 MB of 200.0 MB · 2.0 MB/s');

    expect(downloadStatusText({ state: 'completed', skipped: true })).toBe('Already downloaded');

    expect(downloadStatusText({ state: 'failed', error: 'The connection stalled.' })).toBe(
      'Failed: The connection stalled.',
    );
  });

  it('shows progress, full when completed', () => {
    expect(downloadPercent({ state: 'downloading', received: 30, total: 120 })).toBe(25);
    expect(downloadPercent({ state: 'completed', received: 0, total: 0 })).toBe(100);
  });

  it('summarises which queue buttons apply', () => {
    expect(queueSummary([{ state: 'paused' }, { state: 'completed' }])).toEqual({
      hasRunning: false,
      hasPaused: true,
      hasFinished: true,
    });
  });
});
