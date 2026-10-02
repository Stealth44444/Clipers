import { describe, expect, it } from 'vitest';
import { includeInSettlement } from './campaignStop';
import { settlementPeriodFor } from './settlement';

// Week of Monday 2026-09-21 (Korea time): 2026-09-20T15:00Z to 2026-09-27T15:00Z.
const STOP_WEEK = settlementPeriodFor('2026-09-21');
const NEXT_WEEK = settlementPeriodFor('2026-09-28');
const STOPPED_AT = '2026-09-23T05:00:00.000Z';

describe('includeInSettlement', () => {
  it('settles every clip of a campaign that was not stopped', () => {
    expect(includeInSettlement('2026-09-25T00:00:00.000Z', null, NEXT_WEEK)).toBe(true);
  });

  it('settles clips approved before the stop, through the week of the stop', () => {
    expect(includeInSettlement('2026-09-22T00:00:00.000Z', STOPPED_AT, STOP_WEEK)).toBe(true);
    expect(includeInSettlement(STOPPED_AT, STOPPED_AT, STOP_WEEK)).toBe(true);
  });

  it('stops settling from the week after the stop', () => {
    expect(includeInSettlement('2026-09-22T00:00:00.000Z', STOPPED_AT, NEXT_WEEK)).toBe(false);
  });

  it('never settles a clip approved after the stop', () => {
    expect(includeInSettlement('2026-09-23T06:00:00.000Z', STOPPED_AT, STOP_WEEK)).toBe(false);
  });

  it('leaves clips without a review time to the settlement rules', () => {
    expect(includeInSettlement(null, STOPPED_AT, STOP_WEEK)).toBe(true);
  });
});
