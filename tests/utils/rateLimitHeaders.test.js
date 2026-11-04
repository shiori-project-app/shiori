import { describe, expect, it } from 'vitest';
import { retryDelayMilliseconds, serverAllowance } from '@/utils/rateLimitHeaders';

const NOW = 1_800_000_000_000;

describe('serverAllowance', () => {
  it('turns the advertised limit into a rate just under it', () => {
    const allowance = serverAllowance(new Headers({ 'X-RateLimit-Limit': '30', 'X-RateLimit-Remaining': '12' }));

    expect(allowance.refillPerSecond).toBeCloseTo(0.45);
    expect(allowance.remaining).toBe(12);
  });

  it('keeps a remaining count of zero', () => {
    const allowance = serverAllowance(new Headers({ 'X-RateLimit-Limit': '90', 'X-RateLimit-Remaining': '0' }));

    expect(allowance.remaining).toBe(0);
  });

  it('gives nothing when the headers are missing or unreadable', () => {
    expect(serverAllowance(new Headers())).toBeNull();
    expect(serverAllowance(new Headers({ 'X-RateLimit-Limit': 'soon', 'X-RateLimit-Remaining': '4' }))).toBeNull();
  });
});

describe('retryDelayMilliseconds', () => {
  it('prefers Retry-After when the page can read it', () => {
    const headers = new Headers({ 'Retry-After': '12', 'X-RateLimit-Reset': String(NOW / 1000 + 40) });

    expect(retryDelayMilliseconds(headers, 5, NOW)).toBe(12000);
  });

  it('falls back to the reset time, because cross-origin rules hide Retry-After', () => {
    const headers = new Headers({ 'X-RateLimit-Reset': String(NOW / 1000 + 40) });

    expect(retryDelayMilliseconds(headers, 5, NOW)).toBe(40000);
  });

  it('uses the default when the reset time has passed or nothing is sent', () => {
    expect(retryDelayMilliseconds(new Headers({ 'X-RateLimit-Reset': String(NOW / 1000 - 1) }), 5, NOW)).toBe(5000);
    expect(retryDelayMilliseconds(new Headers(), 5, NOW)).toBe(5000);
  });
});
