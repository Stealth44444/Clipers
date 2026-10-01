'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { MIN_WITHDRAWAL } from '@clipers/db';
import { Button, formatKRW } from '@clipers/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

/** Requests every pending settlement at once; the database refuses balances under MIN_WITHDRAWAL. */
export default function RequestPayoutButton({ amount, canRequest, shortfall }: { amount: number; canRequest: boolean; shortfall: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');

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
        <p className="cl-panel__label">지금 요청할 수 있는 금액</p>
        <p className="cl-budget-figure">{formatKRW(amount)}</p>
        <p className="cl-meta">
          {canRequest
            ? '정산 대기 중인 금액을 한 번에 요청해요. 원천징수 후 실지급액 기준이에요.'
            : `${formatKRW(MIN_WITHDRAWAL)}부터 요청할 수 있어요. ${formatKRW(shortfall)} 더 쌓이면 요청할 수 있어요.`}
        </p>
        {error && (
          <p className="cl-alert cl-tone-tomato" role="alert">
            {error}
          </p>
        )}
      </div>
      <Button disabled={!canRequest || pending} onClick={() => void request()} variant="primary">
        {pending ? '요청 중…' : '지급 요청'}
      </Button>
    </div>
  );
}
