// Creator payouts: business-income withholding (3% income tax + 10% of it as local income tax, both cut to 10 won,
// nothing withheld when the income tax is under 1,000 won) worked out once per payout, plus the checks on the
// payout details a creator registers. Design: docs/superpowers/specs/2026-10-01-creator-payouts-design.md.
// request_payout() in supabase/migrations mirrors payoutTax() (enforced by payouts.test.ts).

/** Income tax, percent of the payout. */
export const INCOME_TAX_PERCENT = 3;
/** Local income tax, percent of the income tax. */
export const LOCAL_TAX_PERCENT = 10;
/** Withholding below this much income tax is not collected (소액부징수, 소득세법 제86조). */
export const MIN_WITHHOLDING_TAX = 1000;
/** 1인 미디어 콘텐츠 창작자 — the business code on the monthly payment statement. */
export const CREATOR_BUSINESS_CODE = '940306';
/** Pilot policy: only adults register payout details (minors need a guardian's consent flow first). */
export const MIN_PAYOUT_AGE = 19;

export type PayoutTax = { gross: number; incomeTax: number; localTax: number; net: number };

/** Taxes on one payout. `settled` is the sum of its settlements; payouts are made in whole won. */
export function payoutTax(settled: number): PayoutTax {
  const gross = Math.max(0, Math.floor(settled));
  // Integer arithmetic (3% cut to 10 won = floor(gross * 3 / 1000) * 10) so floats can't drop 10 won.
  const incomeTax = Math.floor((gross * INCOME_TAX_PERCENT) / 1000) * 10;
  if (incomeTax < MIN_WITHHOLDING_TAX) return { gross, incomeTax: 0, localTax: 0, net: gross };
  const localTax = Math.floor((incomeTax * LOCAL_TAX_PERCENT) / 1000) * 10;
  return { gross, incomeTax, localTax, net: gross - incomeTax - localTax };
}

export const BANKS: { code: string; name: string }[] = [
  { code: '004', name: 'KB국민은행' },
  { code: '088', name: '신한은행' },
  { code: '020', name: '우리은행' },
  { code: '081', name: '하나은행' },
  { code: '011', name: 'NH농협은행' },
  { code: '012', name: '지역농·축협' },
  { code: '003', name: 'IBK기업은행' },
  { code: '090', name: '카카오뱅크' },
  { code: '092', name: '토스뱅크' },
  { code: '089', name: '케이뱅크' },
  { code: '071', name: '우체국' },
  { code: '023', name: 'SC제일은행' },
  { code: '027', name: '한국씨티은행' },
  { code: '002', name: 'KDB산업은행' },
  { code: '007', name: '수협은행' },
  { code: '031', name: 'iM뱅크(대구)' },
  { code: '032', name: '부산은행' },
  { code: '039', name: '경남은행' },
  { code: '034', name: '광주은행' },
  { code: '037', name: '전북은행' },
  { code: '035', name: '제주은행' },
  { code: '045', name: '새마을금고' },
  { code: '048', name: '신협' },
  { code: '050', name: '저축은행' },
];

export function bankName(code: string): string {
  return BANKS.find((bank) => bank.code === code)?.name ?? code;
}

/** 110-123-****89 style: enough to recognise the account, not enough to use it. */
export function maskAccountNumber(accountNumber: string): string {
  if (accountNumber.length <= 6) return accountNumber.replace(/.(?=.{2})/g, '*');
  return `${accountNumber.slice(0, 3)}${'*'.repeat(accountNumber.length - 5)}${accountNumber.slice(-2)}`;
}

export type PayoutDetailsInput = { legalName: string; bankCode: string; accountNumber: string; rrn: string };

export type PayoutDetails = { legalName: string; bankCode: string; accountNumber: string; rrn: string; birthDate: string };

/**
 * Checks what a creator typed and normalises it (digits only). Resident numbers issued since October 2020 have no
 * check digit, so only the shape and the birth date are checked. Foreign registration numbers (5–8) are accepted.
 */
export function validatePayoutDetails(input: PayoutDetailsInput, now: Date = new Date()): { ok: true; data: PayoutDetails } | { ok: false; message: string } {
  const legalName = input.legalName.trim();
  const accountNumber = input.accountNumber.replace(/[\s-]/g, '');
  const rrn = input.rrn.replace(/[\s-]/g, '');

  if (!legalName || legalName.length > 40) return { ok: false, message: '실명을 입력해 주세요.' };
  if (!BANKS.some((bank) => bank.code === input.bankCode)) return { ok: false, message: '은행을 선택해 주세요.' };
  if (!/^\d{6,20}$/.test(accountNumber)) return { ok: false, message: '계좌번호를 숫자로 입력해 주세요.' };
  if (!/^\d{13}$/.test(rrn)) return { ok: false, message: '주민등록번호 13자리를 입력해 주세요.' };

  const genderDigit = Number(rrn[6]);
  if (genderDigit < 1 || genderDigit > 8) return { ok: false, message: '주민등록번호를 확인해 주세요.' };
  const century = [1, 2, 5, 6].includes(genderDigit) ? 1900 : 2000;
  const year = century + Number(rrn.slice(0, 2));
  const month = Number(rrn.slice(2, 4));
  const day = Number(rrn.slice(4, 6));
  const birth = new Date(Date.UTC(year, month - 1, day));
  if (birth.getUTCFullYear() !== year || birth.getUTCMonth() !== month - 1 || birth.getUTCDate() !== day) {
    return { ok: false, message: '주민등록번호를 확인해 주세요.' };
  }
  const birthDate = birth.toISOString().slice(0, 10);
  if (ageOn(birthDate, now) < MIN_PAYOUT_AGE) {
    return { ok: false, message: `지급 정보는 만 ${MIN_PAYOUT_AGE}세 이상만 등록할 수 있어요. 운영팀에 문의해 주세요.` };
  }

  return { ok: true, data: { legalName, bankCode: input.bankCode, accountNumber, rrn, birthDate } };
}

/** Full years of age on `now`'s date in Korea. */
export function ageOn(birthDate: string, now: Date = new Date()): number {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(now);
  const [birthYear, birthMonth, birthDay] = birthDate.split('-').map(Number);
  const [year, month, day] = today.split('-').map(Number);
  return year - birthYear - (month < birthMonth || (month === birthMonth && day < birthDay) ? 1 : 0);
}
