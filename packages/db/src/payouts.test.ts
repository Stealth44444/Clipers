import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { MIN_WITHDRAWAL } from './pricing';
import { ageOn, maskAccountNumber, payoutTax, validatePayoutDetails } from './payouts';

const MIGRATIONS_DIR = fileURLToPath(new URL('../../../supabase/migrations/', import.meta.url));
const migrations = () =>
  readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort()
    .map((file) => readFileSync(MIGRATIONS_DIR + file, 'utf8'))
    .join('\n');

describe('payoutTax', () => {
  it('withholds 3% income tax and 10% of it as local tax, each cut to 10 won', () => {
    expect(payoutTax(100_000)).toEqual({ gross: 100_000, incomeTax: 3_000, localTax: 300, net: 96_700 });
    expect(payoutTax(123_456.78)).toEqual({ gross: 123_456, incomeTax: 3_700, localTax: 370, net: 119_386 });
  });

  it('withholds nothing while the income tax is under 1,000 won', () => {
    expect(payoutTax(33_333)).toEqual({ gross: 33_333, incomeTax: 0, localTax: 0, net: 33_333 });
    expect(payoutTax(MIN_WITHDRAWAL)).toEqual({ gross: MIN_WITHDRAWAL, incomeTax: 0, localTax: 0, net: MIN_WITHDRAWAL });
  });

  it('starts withholding at 33,334 won', () => {
    expect(payoutTax(33_334)).toEqual({ gross: 33_334, incomeTax: 1_000, localTax: 100, net: 32_234 });
  });

  it('is the same calculation as payout_tax() in the database', () => {
    const sql = migrations();
    expect(sql).toContain('income_tax := (floor(gross * 3 / 1000.0) * 10)::integer;');
    expect(sql).toContain('if income_tax < 1000 then');
    expect(sql).toContain('local_tax := (floor(income_tax / 100.0) * 10)::integer;');
    expect(sql).toContain(`if settled < ${MIN_WITHDRAWAL} then`);
  });
});

describe('validatePayoutDetails', () => {
  const now = new Date('2026-10-01T03:00:00.000Z');
  const valid = { legalName: ' 김하린 ', bankCode: '088', accountNumber: '110-123-456789', rrn: '950101-2345678' };

  it('normalises valid details and reads the birth date', () => {
    expect(validatePayoutDetails(valid, now)).toEqual({
      ok: true,
      data: { legalName: '김하린', bankCode: '088', accountNumber: '110123456789', rrn: '9501012345678', birthDate: '1995-01-01' },
    });
  });

  it('reads 2000s births and foreign registration numbers', () => {
    const result = validatePayoutDetails({ ...valid, rrn: '0503154123456' }, now);
    expect(result.ok && result.data.birthDate).toBe('2005-03-15');
    expect(validatePayoutDetails({ ...valid, rrn: '9001015123456' }, now).ok).toBe(true);
  });

  it('rejects impossible dates and malformed numbers', () => {
    expect(validatePayoutDetails({ ...valid, rrn: '9502301234567' }, now).ok).toBe(false);
    expect(validatePayoutDetails({ ...valid, rrn: '9501019234567' }, now).ok).toBe(false);
    expect(validatePayoutDetails({ ...valid, rrn: '95010112345' }, now).ok).toBe(false);
    expect(validatePayoutDetails({ ...valid, accountNumber: '12-34' }, now).ok).toBe(false);
    expect(validatePayoutDetails({ ...valid, bankCode: '999' }, now).ok).toBe(false);
    expect(validatePayoutDetails({ ...valid, legalName: '  ' }, now).ok).toBe(false);
  });

  it('turns away minors', () => {
    const result = validatePayoutDetails({ ...valid, rrn: '0710024123456' }, now);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain('만 19세 이상');
  });
});

describe('ageOn', () => {
  it('counts a birthday only once it has arrived in Korea', () => {
    expect(ageOn('2007-10-01', new Date('2026-09-30T14:59:00.000Z'))).toBe(18);
    expect(ageOn('2007-10-01', new Date('2026-09-30T15:00:00.000Z'))).toBe(19);
  });
});

describe('maskAccountNumber', () => {
  it('keeps the first three and last two digits', () => {
    expect(maskAccountNumber('110123456789')).toBe('110*******89');
  });
});
