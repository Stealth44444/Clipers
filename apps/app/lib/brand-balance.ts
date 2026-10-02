import { cache } from 'react';
import { balanceSummary, type BalanceEntryKind } from '@clipers/db';
import { getSession } from './session';

export type BalanceRow = { id: string; kind: BalanceEntryKind; amount: number; campaign_id: string | null; refundable_until: string | null; created_at: string };
export type RefundRow = {
  id: string;
  kind: 'leftover' | 'over_deposit';
  campaign_id: string | null;
  service_amount: number | null;
  transfer_amount: number;
  bank_code: string | null;
  account_number: string | null;
  status: 'requested' | 'paid';
  requested_at: string;
  paid_at: string | null;
};

/** The signed-in brand's balance ledger, its summary and its returns, deduplicated per request. */
export const getBrandBalance = cache(async () => {
  const { supabase, user } = await getSession();
  const [{ data: entries }, { data: refunds }] = await Promise.all([
    supabase
      .from('brand_balance_entries')
      .select('id, kind, amount, campaign_id, refundable_until, created_at')
      .eq('brand_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('brand_refunds')
      .select('id, kind, campaign_id, service_amount, transfer_amount, bank_code, account_number, status, requested_at, paid_at')
      .eq('brand_id', user.id)
      .order('requested_at', { ascending: false }),
  ]);
  const rows = ((entries ?? []) as BalanceRow[]).map((row) => ({ ...row, amount: Number(row.amount) }));
  return {
    rows,
    refunds: (refunds ?? []) as RefundRow[],
    summary: balanceSummary(rows.map((row) => ({ kind: row.kind, amount: row.amount, refundableUntil: row.refundable_until }))),
  };
});
