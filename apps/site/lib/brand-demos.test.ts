import { describe, expect, it } from 'vitest';
import { CAMPAIGN_REQUIREMENTS_MAX, PLATFORMS } from '@clipers/db';
import { BUDGET_TOTAL, EDITOR_PLATFORMS, EDITOR_SELECTED_PLATFORMS, RECEIVED_CLIPS, REQUIREMENTS_TEXT, budgetFrames, verifiedFrames } from './brand-demos';

describe('solution card scenes', () => {
  it('selects some, not all, of the editor platforms', () => {
    expect(EDITOR_SELECTED_PLATFORMS).toBeGreaterThan(0);
    expect(EDITOR_SELECTED_PLATFORMS).toBeLessThan(EDITOR_PLATFORMS.length);
  });

  it('shows received clips on real platforms, mostly approved with one still in review', () => {
    const platforms = new Set<string>(PLATFORMS.map((platform) => platform.value));
    for (const clip of RECEIVED_CLIPS) expect(platforms.has(clip.platform)).toBe(true);
    expect(RECEIVED_CLIPS.filter((clip) => clip.review === 'pending')).toHaveLength(1);
  });
});

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
