import { describe, it, expect } from 'vitest';
import { getOverdueItems, isSlaDeadlineExceeded } from './sla';

describe('isSlaDeadlineExceeded', () => {
  it('returns true only when the deadline has passed', () => {
    expect(isSlaDeadlineExceeded(new Date('2026-01-03T00:00:00Z'), new Date('2026-01-02T23:59:59Z'))).toBe(false);
    expect(isSlaDeadlineExceeded(new Date('2026-01-03T00:00:00Z'), new Date('2026-01-03T00:00:00Z'))).toBe(false);
    expect(isSlaDeadlineExceeded(new Date('2026-01-03T00:00:00Z'), new Date('2026-01-03T00:00:01Z'))).toBe(true);
  });
});

describe('getOverdueItems', () => {
  it('filters only pending items that crossed the deadline', () => {
    const items = [
      { id: 'a', status: 'pending_review', deadline: '2026-01-02T00:00:00Z' },
      { id: 'b', status: 'approved', deadline: '2026-01-02T00:00:00Z' },
      { id: 'c', status: 'pending_review', deadline: '2026-01-05T00:00:00Z' },
      { id: 'd', status: 'rejected', deadline: '2026-01-02T00:00:00Z' },
    ];

    const overdue = getOverdueItems(items, new Date('2026-01-04T00:00:00Z'));
    expect(overdue.map((item) => item.id)).toEqual(['a']);
  });

  it('ignores missing or invalid deadlines', () => {
    const items = [
      { id: 'a', status: 'pending_review', deadline: null },
      { id: 'b', status: 'pending_review', deadline: 'not-a-date' },
    ];
    expect(getOverdueItems(items, new Date('2026-01-04T00:00:00Z'))).toEqual([]);
  });
});
