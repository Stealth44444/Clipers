import { describe, expect, it } from 'vitest';
import { CAMPAIGN_REQUIREMENTS_MAX } from '@clipers/db';
import { BUDGET_TOTAL, REQUIREMENTS_TEXT, budgetFrames, verifiedFrames } from './brand-demos';

describe('control and start demos', () => {
  it('keeps the requirements within the app field limit', () => {
    expect(REQUIREMENTS_TEXT.length).toBeLessThanOrEqual(CAMPAIGN_REQUIREMENTS_MAX);
  });

  it('spends the budget down without running out', () => {
    const frames = budgetFrames();
    frames.slice(1).forEach(({ state }, index) => expect(state).toBeLessThan(frames[index].state));
    expect(frames[frames.length - 1].state).toBeGreaterThan(BUDGET_TOTAL / 2);
  });

  it('counts verified views up', () => {
    const frames = verifiedFrames();
    expect(frames[frames.length - 1].state).toBeGreaterThan(frames[0].state);
  });
});
