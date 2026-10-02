import { describe, expect, it } from 'vitest';
import {
  REFUND_WINDOW_MONTHS,
  balanceSummary,
  businessDaysSince,
  classifyDeposit,
  depositDue,
  maxCredit,
  refundTransferAmount,
  validateRefundRequest,
  type BalanceEntry,
} from './brandBalance';

const NOW = new Date('2026-10-02T03:00:00.000Z');
const FUTURE = '2027-10-01T00:00:00.000Z';
const PAST = '2026-09-01T00:00:00.000Z';
const leftover = (amount: number, refundableUntil: string): BalanceEntry => ({ kind: 'leftover', amount, refundableUntil });
const applied = (amount: number): BalanceEntry => ({ kind: 'applied', amount: -amount, refundableUntil: null });
const refunded = (amount: number): BalanceEntry => ({ kind: 'refunded', amount: -amount, refundableUntil: null });

describe('balanceSummary', () => {
  it('is empty without entries', () => {
    expect(balanceSummary([], NOW)).toEqual({ balance: 0, refundable: 0, campaignOnly: 0 });
  });

  it('lets a leftover inside its window be returned in full', () => {
    expect(balanceSummary([leftover(300_000, FUTURE)], NOW)).toEqual({ balance: 300_000, refundable: 300_000, campaignOnly: 0 });
  });

  it('keeps a leftover past its window for campaigns only', () => {
    expect(balanceSummary([leftover(300_000, PAST)], NOW)).toEqual({ balance: 300_000, refundable: 0, campaignOnly: 300_000 });
  });

  it('counts a leftover whose window ends right now as past it', () => {
    expect(balanceSummary([leftover(100_000, NOW.toISOString())], NOW).refundable).toBe(0);
  });

  it('takes spending from the expired part first', () => {
    // 300,000 expired + 200,000 fresh, 250,000 used: 50,000 of the expired part is left, so 200,000 can be returned.
    const entries = [leftover(300_000, PAST), leftover(200_000, FUTURE), applied(250_000)];
    expect(balanceSummary(entries, NOW)).toEqual({ balance: 250_000, refundable: 200_000, campaignOnly: 50_000 });
  });

  it('lets everything be returned once spending covered the expired part', () => {
    const entries = [leftover(100_000, PAST), leftover(200_000, FUTURE), applied(150_000)];
    expect(balanceSummary(entries, NOW)).toEqual({ balance: 150_000, refundable: 150_000, campaignOnly: 0 });
  });

  it('counts returned amounts as spent', () => {
    expect(balanceSummary([leftover(200_000, FUTURE), refunded(200_000)], NOW)).toEqual({ balance: 0, refundable: 0, campaignOnly: 0 });
  });
});

describe('deposit with balance', () => {
  it('uses the balance up to the service amount', () => {
    expect(maxCredit(300_000, 1_000_000)).toBe(300_000);
    expect(maxCredit(1_500_000, 1_000_000)).toBe(1_000_000);
    expect(maxCredit(0, 1_000_000)).toBe(0);
  });

  it('asks for the rest of the service amount plus its VAT', () => {
    expect(depositDue(1_000_000, 0)).toBe(1_100_000);
    expect(depositDue(1_000_000, 300_000)).toBe(770_000);
    expect(depositDue(1_000_000, 1_000_000)).toBe(0);
  });
});

describe('classifyDeposit', () => {
  it('tells short, exact and over deposits apart', () => {
    expect(classifyDeposit(1_100_000, 1_000_000)).toEqual({ kind: 'short', difference: 100_000 });
    expect(classifyDeposit(1_100_000, 1_100_000)).toEqual({ kind: 'exact', difference: 0 });
    expect(classifyDeposit(1_100_000, 1_150_000)).toEqual({ kind: 'over', difference: 50_000 });
    expect(classifyDeposit(0, 0)).toEqual({ kind: 'exact', difference: 0 });
  });
});

describe('refundTransferAmount', () => {
  it('returns the service amount and its VAT with nothing deducted', () => {
    expect(refundTransferAmount(300_000)).toBe(330_000);
    expect(refundTransferAmount(12_345)).toBe(13_579);
  });
});

describe('validateRefundRequest', () => {
  const valid = { amount: 100_000, bankCode: '004', accountNumber: '123-456-789012', accountHolder: ' 주식회사 예시 ' };

  it('normalises a valid request', () => {
    expect(validateRefundRequest(valid, 300_000)).toEqual({
      ok: true,
      data: { amount: 100_000, bankCode: '004', accountNumber: '123456789012', accountHolder: '주식회사 예시' },
    });
  });

  it('refuses amounts outside what can be returned', () => {
    expect(validateRefundRequest({ ...valid, amount: 0 }, 300_000).ok).toBe(false);
    expect(validateRefundRequest({ ...valid, amount: 1.5 }, 300_000).ok).toBe(false);
    const over = validateRefundRequest({ ...valid, amount: 300_001 }, 300_000);
    expect(over.ok).toBe(false);
    if (!over.ok) expect(over.message).toContain('300,000원');
  });

  it('refuses an unknown bank, a bad account number or no holder', () => {
    expect(validateRefundRequest({ ...valid, bankCode: '999' }, 300_000).ok).toBe(false);
    expect(validateRefundRequest({ ...valid, accountNumber: '12ab' }, 300_000).ok).toBe(false);
    expect(validateRefundRequest({ ...valid, accountHolder: '  ' }, 300_000).ok).toBe(false);
  });
});

describe('businessDaysSince', () => {
  // 2026-10-02 is a Friday. Public holidays are not taken out.
  const requested = '2026-10-02T01:00:00.000Z';

  it('counts weekdays after the request day, Korea time', () => {
    expect(businessDaysSince(requested, new Date('2026-10-02T09:00:00.000Z'))).toBe(0);
    expect(businessDaysSince(requested, new Date('2026-10-05T01:00:00.000Z'))).toBe(1);
    expect(businessDaysSince(requested, new Date('2026-10-09T01:00:00.000Z'))).toBe(5);
  });
});

describe('REFUND_WINDOW_MONTHS', () => {
  it('is one year', () => {
    expect(REFUND_WINDOW_MONTHS).toBe(12);
  });
});
