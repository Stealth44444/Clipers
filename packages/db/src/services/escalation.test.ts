import { describe, expect, it } from 'vitest';
import { buildEscalationSummary, getEscalationCandidates } from './escalation';

describe('getEscalationCandidates', () => {
  it('returns only idle pending clips whose deadline has passed and have not been escalated yet', () => {
    const items = [
      { id: 'a', status: 'pending_review', deadline: '2026-01-02T00:00:00Z', escalationSentAt: null },
      { id: 'b', status: 'approved', deadline: '2026-01-02T00:00:00Z', escalationSentAt: null },
      { id: 'c', status: 'pending_review', deadline: '2026-01-05T00:00:00Z', escalationSentAt: null },
      { id: 'd', status: 'pending_review', deadline: '2026-01-02T00:00:00Z', escalationSentAt: '2026-01-03T00:00:00Z' },
    ];

    const result = getEscalationCandidates(items, new Date('2026-01-04T00:00:00Z'));
    expect(result.map((item) => item.id)).toEqual(['a']);
  });
});

describe('buildEscalationSummary', () => {
  it('summarizes the overdue escalation IDs', () => {
    const summary = buildEscalationSummary(
      [
        { id: 'a', status: 'pending_review', deadline: '2026-01-01T00:00:00Z' },
        { id: 'b', status: 'pending_review', deadline: '2026-01-10T00:00:00Z' },
      ],
      new Date('2026-01-02T00:00:00Z')
    );

    expect(summary).toEqual({ total: 1, ids: ['a'] });
  });
});
