// Brand balance: what is left of a stopped campaign's service amount, spent on a later campaign or returned.
// Amounts are service won without VAT; VAT is added only when money moves (depositAmount).
// brand_balance(), deposit_due() and the refund window in supabase/migrations mirror this file (brandBalance.test.ts).
import { depositAmount } from './billing';
import { BANKS } from './payouts';

/** A leftover can be returned for this many months after it is fixed; after that it can only go into a campaign. */
export const REFUND_WINDOW_MONTHS = 12;

export type BalanceEntryKind = 'leftover' | 'applied' | 'refunded';
/** One row of brand_balance_entries: leftovers are positive, spending and returns negative. */
export type BalanceEntry = { kind: BalanceEntryKind; amount: number; refundableUntil: string | null };
export type BalanceSummary = { balance: number; refundable: number; campaignOnly: number };

/**
 * The brand's balance and how much of it can still be returned. Spending is taken from leftovers past their window
 * first, which leaves the brand as much returnable money as possible.
 */
export function balanceSummary(entries: BalanceEntry[], now: Date = new Date()): BalanceSummary {
  let balance = 0;
  let expired = 0;
  let used = 0;
  for (const entry of entries) {
    balance += entry.amount;
    if (entry.kind === 'leftover') {
      if (entry.refundableUntil && Date.parse(entry.refundableUntil) <= now.getTime()) expired += entry.amount;
    } else {
      used -= entry.amount;
    }
  }
  const refundable = Math.max(0, balance - Math.max(0, expired - used));
  return { balance, refundable, campaignOnly: balance - refundable };
}

/** Most of the balance a campaign can use: all of it, up to the campaign's service amount. */
export function maxCredit(balance: number, serviceAmount: number): number {
  return Math.max(0, Math.min(balance, serviceAmount));
}

/** What the brand transfers after putting `credit` of its balance into a campaign: the rest plus its VAT. */
export function depositDue(serviceAmount: number, credit: number): number {
  return depositAmount(serviceAmount - credit);
}

export type DepositCheck = { kind: 'short' | 'exact' | 'over'; difference: number };

/** Compares what reached the bank account (VAT included) with what was due. */
export function classifyDeposit(due: number, received: number): DepositCheck {
  if (received < due) return { kind: 'short', difference: due - received };
  if (received > due) return { kind: 'over', difference: received - due };
  return { kind: 'exact', difference: 0 };
}

/** What Clipers transfers back for a returned service amount: the amount and its VAT, nothing deducted. */
export function refundTransferAmount(serviceAmount: number): number {
  return depositAmount(serviceAmount);
}

export type RefundRequestInput = { amount: number; bankCode: string; accountNumber: string; accountHolder: string };

/** Checks a return request against what can be returned and normalises the account number to digits. */
export function validateRefundRequest(
  input: RefundRequestInput,
  refundable: number
): { ok: true; data: RefundRequestInput } | { ok: false; message: string } {
  const accountNumber = input.accountNumber.replace(/[\s-]/g, '');
  const accountHolder = input.accountHolder.trim();

  if (!Number.isInteger(input.amount) || input.amount < 1) return { ok: false, message: '반환받을 금액을 입력해 주세요.' };
  if (input.amount > refundable) return { ok: false, message: `반환할 수 있는 금액은 ${refundable.toLocaleString('ko-KR')}원까지예요.` };
  if (!BANKS.some((bank) => bank.code === input.bankCode)) return { ok: false, message: '은행을 선택해 주세요.' };
  if (!/^\d{6,20}$/.test(accountNumber)) return { ok: false, message: '계좌번호를 숫자로 입력해 주세요.' };
  if (!accountHolder || accountHolder.length > 100) return { ok: false, message: '예금주를 입력해 주세요.' };
  return { ok: true, data: { amount: input.amount, bankCode: input.bankCode, accountNumber, accountHolder } };
}

const KOREA_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Weekdays after the day of `fromIso` up to today, Korea time (public holidays are not taken out). */
export function businessDaysSince(fromIso: string, now: Date = new Date()): number {
  const start = Math.floor((Date.parse(fromIso) + KOREA_OFFSET_MS) / DAY_MS);
  const end = Math.floor((now.getTime() + KOREA_OFFSET_MS) / DAY_MS);
  let days = 0;
  for (let day = start + 1; day <= end; day += 1) {
    const weekday = new Date(day * DAY_MS).getUTCDay();
    if (weekday !== 0 && weekday !== 6) days += 1;
  }
  return days;
}
