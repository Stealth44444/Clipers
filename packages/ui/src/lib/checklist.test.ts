import { describe, it, expect } from 'vitest';
import { checklistProgress } from './checklist';

describe('checklistProgress', () => {
  it('counts done items and points at the first unfinished one', () => {
    expect(
      checklistProgress([
        { id: 'account', done: true },
        { id: 'apply', done: false },
        { id: 'submit', done: false },
      ])
    ).toEqual({ done: 1, total: 3, currentId: 'apply' });
  });

  it('has no current item once everything is done', () => {
    expect(checklistProgress([{ id: 'a', done: true }])).toEqual({ done: 1, total: 1, currentId: null });
  });
});
