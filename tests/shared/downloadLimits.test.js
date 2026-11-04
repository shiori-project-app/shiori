import { describe, expect, it } from 'vitest';
import { speedLimitLabel, validDownloadSettings } from '@shared/downloadLimits';

describe('download limits', () => {
  it('keeps only valid download settings', () => {
    expect(validDownloadSettings({ maxParallelDownloads: 3, speedLimitKBps: 5120 })).toEqual({
      maxParallelDownloads: 3,
      speedLimitKBps: 5120,
    });

    expect(validDownloadSettings({ maxParallelDownloads: 0, speedLimitKBps: 123 })).toEqual({});
    expect(validDownloadSettings({ maxParallelDownloads: '2', downloadDir: 'C:\\Windows' })).toEqual({});
    expect(validDownloadSettings(null)).toEqual({});
  });

  it('labels speed limits', () => {
    expect(speedLimitLabel(0)).toBe('Unlimited');
    expect(speedLimitLabel(512)).toBe('512 KB/s');
    expect(speedLimitLabel(5120)).toBe('5 MB/s');
  });
});
