import { describe, expect, it } from 'vitest';
import {
  clampPage,
  lastReachablePage,
  localPageInfo,
  pageCount,
  pageSlice,
  visiblePageNumbers,
} from '@/utils/pagination';

const items = Array.from({ length: 523 }, (_, index) => index + 1);

describe('local pagination', () => {
  it('splits a long list into pages', () => {
    expect(pageCount(items.length, 50)).toBe(11);
    expect(pageSlice(items, 1, 50)).toEqual(items.slice(0, 50));
    expect(pageSlice(items, 11, 50)).toEqual(items.slice(500));
  });

  it('always has at least one page and keeps the page within range', () => {
    expect(pageCount(0, 50)).toBe(1);
    expect(clampPage(14, 11)).toBe(11);
    expect(clampPage(0, 11)).toBe(1);
  });

  it('reaches the real last page even past AniList’s exact-total limit', () => {
    const hugeList = localPageInfo(6000, 3, 120);

    expect(lastReachablePage(hugeList)).toBe(120);
    expect(lastReachablePage({ currentPage: 3, total: 6000, lastPage: 120, hasNextPage: true })).toBe(4);
  });

  it('shows the first, last and neighbouring page numbers', () => {
    expect(visiblePageNumbers(6, 11)).toEqual([1, 4, 5, 6, 7, 8, 11]);
  });
});
