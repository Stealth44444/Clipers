'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MIN_WITHDRAWAL, type PayoutTax } from '@clipers/db';
import { Button, ButtonLink, formatKRW } from '@clipers/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

/** Requests every pending settlement as one payout; the database refuses balances under MIN_WITHDRAWAL or no payout details. */
export default function RequestPayoutButton({ tax, canRequest, shortfall, account }: { tax: PayoutTax; canRequest: boolean; shortfall: number; account: string | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const withheld = tax.incomeTax + tax.localTax;

  async function request() {
    setError('');
    const { error: rpcError } = await getSupabaseBrowserClient().rpc('request_payout');
    if (rpcError) {
      setError('지급 요청을 보내지 못했어요. 새로고침한 뒤 다시 시도해 주세요.');
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div className="cl-payout">
      <div>
        <p className="cl-panel__label">지금 요청하면 받을 금액</p>
        <p className="cl-budget-figure">{formatKRW(tax.net)}</p>
        <p className="cl-meta">
          {!canRequest
            ? `정산액 ${formatKRW(MIN_WITHDRAWAL)}부터 요청할 수 있어요. ${formatKRW(shortfall)} 더 쌓이면 요청할 수 있어요.`
            : withheld > 0
              ? `정산액 ${formatKRW(tax.gross)}에서 세금 ${formatKRW(withheld)}(3.3%)을 뗀 금액이에요.`
              : `정산액 ${formatKRW(tax.gross)} 그대로 받아요. 33,334원부터 세금 3.3%를 떼요.`}
        </p>
        {account ? (
          <p className="cl-meta-subtle">
            {account}로 보내요. <Link className="cl-link" href="/creator/settings#payout">변경</Link>
          </p>
        ) : (
          <p className="cl-meta-subtle">지급 요청 전에 받을 계좌를 등록해 주세요.</p>
        )}
        {error && (
          <p className="cl-alert cl-tone-tomato" role="alert">
            {error}
          </p>
        )}
      </div>
      {account ? (
        <Button disabled={!canRequest || pending} onClick={() => void request()} variant="primary">
          {pending ? '요청 중…' : '지급 요청'}
        </Button>
      ) : (
        <ButtonLink href="/creator/settings#payout" variant="primary">
          지급 정보 등록
        </ButtonLink>
      )}
    </div>
  );
}
