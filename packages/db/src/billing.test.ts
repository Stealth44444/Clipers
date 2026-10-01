import { describe, expect, it } from 'vitest';
import { depositAmount, formatBusinessNumber, isBusinessNumber, validateBillingProfile, vatOn } from './billing';
import { MIN_CAMPAIGN_BUDGET } from './pricing';

describe('deposit with VAT', () => {
  it('adds 10% VAT, cut to the won', () => {
    expect(vatOn(MIN_CAMPAIGN_BUDGET)).toBe(100_000);
    expect(depositAmount(MIN_CAMPAIGN_BUDGET)).toBe(1_100_000);
    expect(depositAmount(1_234_567)).toBe(1_358_023);
  });
});

describe('isBusinessNumber', () => {
  it('accepts a valid check digit, with or without dashes', () => {
    expect(isBusinessNumber('544-87-03492')).toBe(true);
    expect(isBusinessNumber('5448703492')).toBe(true);
  });

  it('rejects a wrong check digit or length', () => {
    expect(isBusinessNumber('5448703493')).toBe(false);
    expect(isBusinessNumber('544870349')).toBe(false);
  });
});

describe('validateBillingProfile', () => {
  const valid = { businessNumber: '544-87-03492', companyName: ' 주식회사 오디오닉스 ', representative: '안준성', invoiceEmail: 'tax@example.com' };

  it('normalises valid details', () => {
    expect(validateBillingProfile(valid)).toEqual({
      ok: true,
      data: { businessNumber: '5448703492', companyName: '주식회사 오디오닉스', representative: '안준성', invoiceEmail: 'tax@example.com' },
    });
  });

  it('rejects bad numbers, empty names and bad emails', () => {
    expect(validateBillingProfile({ ...valid, businessNumber: '1234567890' }).ok).toBe(false);
    expect(validateBillingProfile({ ...valid, companyName: ' ' }).ok).toBe(false);
    expect(validateBillingProfile({ ...valid, representative: '' }).ok).toBe(false);
    expect(validateBillingProfile({ ...valid, invoiceEmail: 'tax@' }).ok).toBe(false);
  });
});

describe('formatBusinessNumber', () => {
  it('groups 3-2-5', () => {
    expect(formatBusinessNumber('5448703492')).toBe('544-87-03492');
  });
});
