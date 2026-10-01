import { describe, it, expect } from 'vitest';
import { brandChecklist } from './brandStats';

describe('brandChecklist', () => {
  it('starts with nothing done', () => {
    expect(brandChecklist({ campaignStatuses: [], clipCount: 0 })).toEqual([
      { id: 'create', done: false },
      { id: 'deposit', done: false },
      { id: 'live', done: false },
      { id: 'first_clip', done: false },
    ]);
  });

  it('counts a deposit once any campaign leaves draft', () => {
    const steps = brandChecklist({ campaignStatuses: ['draft', 'pending_escrow'], clipCount: 0 });
    expect(steps.map((step) => step.done)).toEqual([true, true, false, false]);
  });

  it('treats paused and closed campaigns as having gone live', () => {
    const steps = brandChecklist({ campaignStatuses: ['closed'], clipCount: 3 });
    expect(steps.every((step) => step.done)).toBe(true);
  });
});
