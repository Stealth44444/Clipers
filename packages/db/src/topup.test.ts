import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { MIN_TOPUP, canTopUp, validateTopUp } from './topup';

describe('canTopUp', () => {
  it('allows live campaigns and campaigns closed by their budget', () => {
    expect(canTopUp('live', null)).toBe(true);
    expect(canTopUp('closed', null)).toBe(true);
  });

  it('refuses stopped, draft and unpaid campaigns', () => {
    expect(canTopUp('closed', '2026-10-01T00:00:00Z')).toBe(false);
    expect(canTopUp('draft', null)).toBe(false);
    expect(canTopUp('pending_escrow', null)).toBe(false);
  });
});

describe('validateTopUp', () => {
  it('takes whole won from 100,000 and a credit up to the balance and the amount', () => {
    expect(MIN_TOPUP).toBe(100_000);
    expect(validateTopUp(300_000, 100_000, 500_000)).toEqual({ ok: true });
    expect(validateTopUp(300_000, 300_000, 500_000)).toEqual({ ok: true });
  });

  it('refuses small, fractional or over-credited top-ups', () => {
    expect(validateTopUp(99_999, 0, 0)).toEqual({ ok: false, message: '100,000원부터 늘릴 수 있어요.' });
    expect(validateTopUp(150_000.5, 0, 0).ok).toBe(false);
    expect(validateTopUp(300_000, 200_000, 100_000)).toEqual({ ok: false, message: '잔액은 100,000원까지 쓸 수 있어요.' });
    expect(validateTopUp(300_000, 400_000, 900_000)).toEqual({ ok: false, message: '잔액은 늘릴 금액까지만 쓸 수 있어요.' });
    expect(validateTopUp(300_000, -1, 900_000).ok).toBe(false);
  });
});

const MIGRATIONS_DIR = fileURLToPath(new URL('../../../supabase/migrations/', import.meta.url));
const migrations = () =>
  readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort()
    .map((file) => readFileSync(MIGRATIONS_DIR + file, 'utf8'))
    .join('\n');

describe('migration mirrors topup.ts', () => {
  it('uses the same minimum', () => {
    expect(migrations()).toContain(`amount >= ${MIN_TOPUP}`);
  });
});
