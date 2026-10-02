import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { settlementPeriodFor } from './settlement';
import { runPendingSettlements, runWeeklySettlement } from './weeklySettlementRun';

const PERIOD = settlementPeriodFor('2026-09-21');

/** Records calls; `clips` answers the approved-clip query, `claimError` the settlement_runs insert. */
function fakeSupabase(options: { claimError?: { code: string; message: string }; clips?: { data: unknown[] | null; error: { message: string } | null }; lastRun?: string | null }) {
  const calls: string[] = [];
  const chain = (result: unknown) => {
    const builder: Record<string, unknown> = {};
    for (const method of ['select', 'eq', 'in', 'lt', 'is', 'not', 'order', 'limit', 'range']) builder[method] = () => builder;
    builder.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve);
    return builder;
  };
  const client = {
    from(table: string) {
      return {
        insert: () => {
          calls.push(`${table}.insert`);
          return Promise.resolve({ error: table === 'settlement_runs' ? options.claimError ?? null : null });
        },
        update: () => {
          calls.push(`${table}.update`);
          return chain({ error: null });
        },
        delete: () => {
          calls.push(`${table}.delete`);
          return chain({ error: null });
        },
        select: () =>
          table === 'clips'
            ? chain(options.clips ?? { data: [], error: null })
            : chain({ data: table === 'settlement_runs' && options.lastRun ? [{ period: options.lastRun }] : [], error: null }),
      };
    },
  };
  return { supabase: client as unknown as SupabaseClient, calls };
}

describe('runWeeklySettlement', () => {
  it('leaves a week alone when another run already claimed it', async () => {
    const { supabase, calls } = fakeSupabase({ claimError: { code: '23505', message: 'duplicate key' } });
    const result = await runWeeklySettlement(supabase, PERIOD, 'cron');
    expect(result).toEqual({ ok: true, data: { period: '2026-09-21', settlements: 0, closedCampaigns: 0, alreadyRun: true } });
    expect(calls).toEqual(['settlement_runs.insert']);
  });

  it('records a week with nothing to settle', async () => {
    const { supabase, calls } = fakeSupabase({});
    const result = await runWeeklySettlement(supabase, PERIOD, 'admin');
    expect(result.ok && result.data).toEqual({ period: '2026-09-21', settlements: 0, closedCampaigns: 0, alreadyRun: false });
    expect(calls).toEqual(['settlement_runs.insert', 'settlement_runs.update']);
  });

  it('releases the claim when settling fails, so the week can run again', async () => {
    const { supabase, calls } = fakeSupabase({ clips: { data: null, error: { message: 'boom' } } });
    const result = await runWeeklySettlement(supabase, PERIOD, 'cron');
    expect(result.ok).toBe(false);
    expect(calls).toEqual(['settlement_runs.insert', 'settlement_runs.delete']);
  });
});

describe('runPendingSettlements', () => {
  it('settles each missed week in order', async () => {
    const { supabase } = fakeSupabase({ lastRun: '2026-09-07' });
    const result = await runPendingSettlements(supabase, 'cron', new Date('2026-09-30T03:00:00.000Z'));
    expect(result.ok && result.data.map((summary) => summary.period)).toEqual(['2026-09-14', '2026-09-21']);
  });
});

describe('finalizing stopped campaigns', () => {
  /** Answers each table with fixed rows and records rpc calls. */
  function tableFake(rows: Record<string, unknown[]>) {
    const rpcs: { name: string; args: unknown }[] = [];
    const chain = (result: unknown) => {
      const builder: Record<string, unknown> = {};
      for (const method of ['select', 'eq', 'in', 'lt', 'is', 'not', 'order', 'limit', 'range']) builder[method] = () => builder;
      builder.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve);
      return builder;
    };
    const client = {
      from(table: string) {
        return {
          insert: () => Promise.resolve({ error: null }),
          update: () => chain({ error: null }),
          delete: () => chain({ error: null }),
          select: () => chain({ data: rows[table] ?? [], error: null }),
        };
      },
      rpc(name: string, args: unknown) {
        rpcs.push({ name, args });
        return Promise.resolve({ data: true, error: null });
      },
    };
    return { supabase: client as unknown as SupabaseClient, rpcs };
  }

  it('fixes the leftover of a campaign stopped before the week ended', async () => {
    const { supabase, rpcs } = tableFake({
      campaigns: [{ id: 'c1' }],
      campaign_finances: [{ campaign_id: 'c1', total_budget: 1_000_000, brand_cpm: 3000, creator_cpm: 800 }],
      settlements: [{ campaign_id: 'c1', amount: 80_000 }],
    });
    const result = await runWeeklySettlement(supabase, PERIOD, 'cron');
    expect(result.ok).toBe(true);
    // 80,000 won to creators is 300,000 won of brand spend, so 700,000 won is left.
    expect(rpcs).toEqual([{ name: 'finalize_campaign', args: { p_campaign_id: 'c1', p_leftover: 700_000 } }]);
  });

  it('does nothing when no stopped campaign is waiting', async () => {
    const { supabase, rpcs } = tableFake({});
    await runWeeklySettlement(supabase, PERIOD, 'cron');
    expect(rpcs).toEqual([]);
  });
});
