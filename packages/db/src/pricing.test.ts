import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import {
  DEFAULT_PRICING,
  MIN_CAMPAIGN_BUDGET,
  budgetUsage,
  campaignEconomics,
  creatorPayoutCap,
  expectedViews,
  platformMargin,
} from './pricing';

const MIGRATIONS_DIR = fileURLToPath(new URL('../../../supabase/migrations/', import.meta.url));
const migrations = () =>
  readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort()
    .map((file) => readFileSync(MIGRATIONS_DIR + file, 'utf8'))
    .join('\n');

describe('pricing defaults', () => {
  it('match the database defaults and minimum budget', () => {
    const sql = migrations();
    expect(sql).toContain(`brand_cpm numeric(12, 2) not null default ${DEFAULT_PRICING.brandCpm}`);
    expect(sql).toContain(`creator_cpm numeric(12, 2) not null default ${DEFAULT_PRICING.creatorCpm}`);
    expect(sql).toContain(`total_budget >= ${MIN_CAMPAIGN_BUDGET}`);
  });

  it('give the public market the same payout limit as creatorPayoutCap', () => {
    // campaign_payout_limits(): floor(total_budget * creator_cpm / brand_cpm), as creatorPayoutCap below.
    expect(migrations()).toContain('floor(c.total_budget * c.creator_cpm / c.brand_cpm)');
  });
});

describe('expectedViews', () => {
  it('converts a budget into views at the brand rate', () => {
    expect(expectedViews(1_000_000, DEFAULT_PRICING)).toBe(333_333);
    expect(expectedViews(0, DEFAULT_PRICING)).toBe(0);
  });
});

describe('creatorPayoutCap', () => {
  it('is the share of the budget that reaches creators', () => {
    expect(creatorPayoutCap(1_000_000, DEFAULT_PRICING)).toBe(266_666);
    expect(creatorPayoutCap(1_000_000, { brandCpm: 1000, creatorCpm: 1000 })).toBe(1_000_000);
  });
});

describe('platformMargin', () => {
  it('is the per-1,000-views spread', () => {
    expect(platformMargin(DEFAULT_PRICING)).toBe(2200);
  });
});

describe('budgetUsage', () => {
  it('converts creator payouts back into brand spend', () => {
    expect(budgetUsage(1_000_000, 80_000, DEFAULT_PRICING)).toEqual({ spent: 300_000, remaining: 700_000, ratio: 0.3 });
  });

  it('never reports more than the budget', () => {
    expect(budgetUsage(1_000_000, 300_000, DEFAULT_PRICING)).toEqual({ spent: 1_000_000, remaining: 0, ratio: 1 });
  });
});

describe('campaignEconomics', () => {
  it('splits brand spend into creator payouts and platform revenue', () => {
    expect(campaignEconomics(1_000_000, 80_000, DEFAULT_PRICING)).toEqual({ spent: 300_000, creatorPaid: 80_000, platformRevenue: 220_000 });
  });

  it('never reports negative platform revenue', () => {
    expect(campaignEconomics(1_000_000, 0, DEFAULT_PRICING).platformRevenue).toBe(0);
  });
});
