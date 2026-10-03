// Budget top-ups: a brand adds service amount to a live campaign, or to one closed because its budget ran out (which
// then reopens). Paid like a campaign deposit. campaign_topups and request_topup() mirror this file (topup.test.ts).

export const MIN_TOPUP = 100_000;

/** A campaign can take a top-up while live, or once closed by its budget; never after the brand stopped it. */
export function canTopUp(status: string, stoppedAt: string | null): boolean {
  if (status === 'live') return true;
  return status === 'closed' && !stoppedAt;
}

/** Checks a top-up of `amount` (service won) paying `credit` of it from a balance of `balance`. */
export function validateTopUp(amount: number, credit: number, balance: number): { ok: true } | { ok: false; message: string } {
  if (!Number.isInteger(amount) || amount < MIN_TOPUP) return { ok: false, message: `${MIN_TOPUP.toLocaleString('ko-KR')}원부터 늘릴 수 있어요.` };
  if (!Number.isInteger(credit) || credit < 0) return { ok: false, message: '잔액 사용 금액을 확인해 주세요.' };
  if (credit > amount) return { ok: false, message: '잔액은 늘릴 금액까지만 쓸 수 있어요.' };
  if (credit > balance) return { ok: false, message: `잔액은 ${Math.max(0, balance).toLocaleString('ko-KR')}원까지 쓸 수 있어요.` };
  return { ok: true };
}
