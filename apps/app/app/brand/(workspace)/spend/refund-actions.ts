'use server';

import { revalidatePath } from 'next/cache';
import { balanceSummary, refundTransferAmount, sendSlackNotification, validateRefundRequest } from '@clipers/db';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export type RefundRequestState = { ok: boolean; message: string } | null;

/** The signed-in brand asks for part of its returnable balance; the database re-checks the amount. */
export async function requestRefund(_previous: RefundRequestState, form: FormData): Promise<RefundRequestState> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: '다시 로그인해 주세요.' };

  const { data: entries } = await supabase.from('brand_balance_entries').select('kind, amount, refundable_until').eq('brand_id', user.id);
  const { refundable } = balanceSummary(
    (entries ?? []).map((row) => ({ kind: row.kind, amount: Number(row.amount), refundableUntil: row.refundable_until }))
  );
  const result = validateRefundRequest(
    {
      amount: Number(form.get('amount')),
      bankCode: String(form.get('bankCode') ?? ''),
      accountNumber: String(form.get('accountNumber') ?? ''),
      accountHolder: String(form.get('accountHolder') ?? ''),
    },
    refundable
  );
  if (!result.ok) return { ok: false, message: result.message };

  const { amount, bankCode, accountNumber, accountHolder } = result.data;
  const { error } = await supabase.rpc('request_refund', {
    p_amount: amount,
    p_bank_code: bankCode,
    p_account_number: accountNumber,
    p_account_holder: accountHolder,
  });
  if (error) {
    return {
      ok: false,
      message: error.hint === 'refund_open' ? '처리 중인 반환 요청이 있어요. 끝난 뒤 다시 요청해 주세요.' : '반환 요청을 보내지 못했어요. 새로고침한 뒤 다시 시도해 주세요.',
    };
  }

  const transfer = refundTransferAmount(amount);
  const webhook = process.env.SLACK_WEBHOOK_URL;
  if (webhook) {
    const { data: profile } = await supabase.from('profiles').select('display_name').eq('id', user.id).single();
    await sendSlackNotification(
      webhook,
      `:money_with_wings: 남은 금액 반환 요청 — ${profile?.display_name ?? '브랜드'} ${transfer.toLocaleString('ko-KR')}원 (서비스 대금 ${amount.toLocaleString('ko-KR')}원 + 부가세). 영업일 7일 안에 보내야 해요.`
    );
  }

  revalidatePath('/brand/spend');
  return { ok: true, message: `반환을 요청했어요. 영업일 7일 안에 ${transfer.toLocaleString('ko-KR')}원을 보내 드려요.` };
}
