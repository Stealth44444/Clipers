import { describe, it, expect } from 'vitest';
import { chunk, fetchAllRows, fetchAllRowsIn } from './paging';

const rows = Array.from({ length: 2345 }, (_, index) => ({ id: index }));
const pageOf = (source: { id: number }[]) => async (from: number, to: number) => ({ data: source.slice(from, to + 1), error: null });

describe('chunk', () => {
  it('splits a list into fixed-size groups', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 3)).toEqual([]);
  });
});

describe('fetchAllRows', () => {
  it('keeps requesting pages until a short page arrives', async () => {
    const calls: [number, number][] = [];
    const page = async (from: number, to: number) => {
      calls.push([from, to]);
      return { data: rows.slice(from, to + 1), error: null };
    };
    expect(await fetchAllRows(page)).toHaveLength(2345);
    expect(calls).toEqual([[0, 999], [1000, 1999], [2000, 2999]]);
  });

  it('returns an empty list when nothing matches', async () => {
    expect(await fetchAllRows(pageOf([]))).toEqual([]);
  });

  it('throws when a page fails', async () => {
    await expect(fetchAllRows(async () => ({ data: null, error: { message: 'boom' } }))).rejects.toThrow('boom');
  });
});

describe('fetchAllRowsIn', () => {
  it('queries ids in chunks and pages each chunk', async () => {
    const ids = Array.from({ length: 250 }, (_, index) => index);
    const seen: number[][] = [];
    const result = await fetchAllRowsIn(ids, (slice) => {
      seen.push(slice);
      return pageOf(slice.map((id) => ({ id })));
    }, 100);
    expect(seen.map((slice) => slice.length)).toEqual([100, 100, 50]);
    expect(result.map((row) => row.id)).toEqual(ids);
  });

  it('skips the query entirely for an empty id list', async () => {
    let called = false;
    await fetchAllRowsIn([], () => {
      called = true;
      return pageOf([]);
    });
    expect(called).toBe(false);
  });
});
