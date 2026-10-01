import { CREATOR_BUSINESS_CODE, INCOME_TAX_PERCENT } from '@clipers/db';
import { NextRequest, NextResponse } from 'next/server';
import { decryptPii, piiEncryptionReady } from '@/lib/pii-crypto';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Monthly withholding report: payouts marked paid in a KST month, summed per creator, with the resident number in
// the clear for the business-income payment statement (간이지급명세서) and the withholding return. Admins only;
// every download is written to pii_access_logs.

const KOREA_OFFSET_MS = 9 * 60 * 60 * 1000;

function csvCell(value: string | number): string {
  const text = String(value);
  const safeText = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safeText.replaceAll('"', '""')}"`;
}

type PaidPayout = { creator_id: string; legal_name: string; gross_amount: number; income_tax: number; local_tax: number; net_amount: number };

export async function GET(request: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  const month = request.nextUrl.searchParams.get('month') ?? '';
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return NextResponse.json({ error: 'month must be YYYY-MM.' }, { status: 400 });
  if (!piiEncryptionReady()) return NextResponse.json({ error: 'PAYOUT_ENCRYPTION_KEY is not configured.' }, { status: 503 });

  const [year, monthNumber] = month.split('-').map(Number);
  const from = new Date(Date.UTC(year, monthNumber - 1, 1) - KOREA_OFFSET_MS).toISOString();
  const to = new Date(Date.UTC(year, monthNumber, 1) - KOREA_OFFSET_MS).toISOString();

  const admin = getSupabaseAdminClient();
  const { data: payouts, error } = await admin
    .from('payouts')
    .select('creator_id, legal_name, gross_amount, income_tax, local_tax, net_amount')
    .eq('status', 'paid')
    .gte('paid_at', from)
    .lt('paid_at', to);
  if (error) return NextResponse.json({ error: 'Could not load payouts.' }, { status: 502 });

  const byCreator = new Map<string, { legalName: string; count: number; gross: number; incomeTax: number; localTax: number; net: number }>();
  for (const payout of (payouts ?? []) as PaidPayout[]) {
    const total = byCreator.get(payout.creator_id) ?? { legalName: payout.legal_name, count: 0, gross: 0, incomeTax: 0, localTax: 0, net: 0 };
    total.count += 1;
    total.gross += payout.gross_amount;
    total.incomeTax += payout.income_tax;
    total.localTax += payout.local_tax;
    total.net += payout.net_amount;
    byCreator.set(payout.creator_id, total);
  }

  const creatorIds = [...byCreator.keys()];
  const { data: accounts, error: accountError } = creatorIds.length
    ? await admin.from('payout_accounts').select('creator_id, rrn_ciphertext').in('creator_id', creatorIds)
    : { data: [], error: null };
  if (accountError) return NextResponse.json({ error: 'Could not load payout accounts.' }, { status: 502 });
  const rrnByCreator = new Map((accounts ?? []).map((account) => [account.creator_id as string, decryptPii(account.rrn_ciphertext as string)]));

  const { error: logError } = await admin
    .from('pii_access_logs')
    .insert({ actor_id: user.id, action: `tax_report:${month}`, subject_count: creatorIds.length });
  if (logError) return NextResponse.json({ error: 'Could not record the access.' }, { status: 502 });

  const rows = [
    ['지급연월', '업종코드', '성명', '주민등록번호', '내외국인', '지급 건수', '지급액', '세율(%)', '소득세', '지방소득세', '실지급액'],
    ...[...byCreator.entries()].map(([creatorId, total]) => {
      const rrn = rrnByCreator.get(creatorId) ?? '';
      return [
        month.replace('-', ''),
        CREATOR_BUSINESS_CODE,
        total.legalName,
        rrn ? `${rrn.slice(0, 6)}-${rrn.slice(6)}` : '지급 정보 없음',
        rrn && Number(rrn[6]) >= 5 ? '외국인' : '내국인',
        total.count,
        total.gross,
        INCOME_TAX_PERCENT,
        total.incomeTax,
        total.localTax,
        total.net,
      ];
    }),
  ];
  const csv = `﻿${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}`;
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="clipers-withholding-${month}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
