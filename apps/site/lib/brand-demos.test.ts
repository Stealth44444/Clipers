import { describe, expect, it } from 'vitest';
import {
  BUDGET_TOTAL,
  DEPOSIT_FRAMES,
  EDITOR_BUDGET,
  EDITOR_CHIPS,
  REQUIREMENTS_TEXT,
  SUBMIT_URL,
  budgetFrames,
  editorDone,
  editorFrames,
  receivedFrames,
  requirementsFrames,
  submitFrames,
  typingSteps,
  verifiedFrames,
} from './brand-demos';

describe('typingSteps', () => {
  it('grows one character at a time', () => {
    expect(typingSteps('300')).toEqual(['3', '30', '300']);
    expect(typingSteps('여름')).toEqual(['여', '여름']);
  });
});

describe('editorFrames', () => {
  const frames = editorFrames();

  it('starts at 2/7 and ends at 5/7 with the budget typed', () => {
    expect(editorDone(frames[0].state)).toBe(2);
    const last = frames[frames.length - 1].state;
    expect(editorDone(last)).toBe(5);
    expect(last).toMatchObject({ clipping: true, chips: EDITOR_CHIPS.length, budget: EDITOR_BUDGET });
  });

  it('rests on the finished form before looping', () => {
    expect(frames[frames.length - 1].ms).toBeGreaterThanOrEqual(2000);
  });

  it('only clicks where the cursor is', () => {
    for (const { state } of frames) if (state.click) expect(state.cursor).not.toBeNull();
  });
});

describe('submitFrames', () => {
  const frames = submitFrames();

  it('submits only after the platform and link are filled', () => {
    const sending = frames.find(({ state }) => state.sending);
    expect(sending?.state).toMatchObject({ platform: true, url: SUBMIT_URL });
  });

  it('ends on the sent notice', () => {
    expect(frames[frames.length - 1].state.sent).toBe(true);
  });
});

describe('receivedFrames', () => {
  const frames = receivedFrames();

  it('always shows four rows', () => {
    for (const { state } of frames) expect(state.rows).toHaveLength(4);
  });

  it('shows each new clip waiting for review, then approved', () => {
    const arrivals = frames.slice(1);
    for (let index = 0; index < arrivals.length; index += 2) {
      const arrived = arrivals[index].state.rows[0];
      expect(arrived.approved).toBe(false);
      expect(arrivals[index + 1].state.rows[0]).toMatchObject({ id: arrived.id, approved: true });
    }
  });

  it('only counts up', () => {
    frames.slice(1).forEach(({ state }, index) => {
      expect(state.views).toBeGreaterThan(frames[index].state.views);
      expect(state.clips).toBeGreaterThanOrEqual(frames[index].state.clips);
    });
  });
});

describe('control and start demos', () => {
  it('types the requirements in full, then holds', () => {
    const frames = requirementsFrames();
    expect(frames[0].state).toBe('');
    expect(frames[frames.length - 1].state).toBe(REQUIREMENTS_TEXT);
    expect(frames[frames.length - 1].ms).toBeGreaterThanOrEqual(3000);
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

  it('walks the deposit from 입금 전 to 진행 중', () => {
    expect(DEPOSIT_FRAMES.map(({ state }) => state.status)).toEqual(['draft', 'draft', 'draft', 'pending_escrow', 'live']);
  });
});
