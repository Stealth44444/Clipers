'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { depositDue, maxCredit, vatOn } from '@clipers/db';
import { Button, Field, Input, SummaryList, formatKRW } from '@clipers/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

/** What to transfer for a draft campaign, with part of the brand balance put in if it has one. */
export default function DepositPanel({ campaignId, serviceAmount, balance, bankTransferInfo, billingReady }: {
  campaignId: string;
  serviceAmount: number;
  balance: number;
  bankTransferInfo: string | null;
  billingReady: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState('');
  const limit = maxCredit(balance, serviceAmount);
  const [creditText, setCreditText] = useState(String(limit));
  const credit = Math.min(limit, Math.max(0, Math.floor(Number(creditText) || 0)));
  const cash = serviceAmount - credit;
  const due = depositDue(serviceAmount, credit);

  async function report() {
    setFailed('');
    const { error } = await getSupabaseBrowserClient().rpc('report_deposit', { p_campaign_id: campaignId, p_credit: credit });
    if (error) {
      setFailed(error.hint === 'credit_too_large' ? '잔액이 바뀌었어요. 새로고침한 뒤 다시 시도해 주세요.' : '상태를 바꾸지 못했어요. 새로고침한 뒤 다시 시도해 주세요.');
    }
    startTransition(() => router.refresh());
  }

  return (
    <div className="cl-stack-tight">
      {limit > 0 && (
        <Field hint={`잔액 ${formatKRW(balance)} 중 ${formatKRW(limit)}까지 쓸 수 있어요.`} htmlFor={`credit-${campaignId}`} label="잔액 사용">
          <Input
            id={`credit-${campaignId}`}
            inputMode="numeric"
            max={limit}
            min={0}
            onChange={(event) => setCreditText(event.target.value)}
            type="number"
            value={creditText}
          />
        </Field>
      )}
      <SummaryList
        rows={[
          { label: '서비스 대금', value: formatKRW(serviceAmount) },
          ...(credit > 0 ? [{ label: '잔액 사용', value: `−${formatKRW(credit)}` }] : []),
          { label: '부가세 (10%)', value: formatKRW(vatOn(cash)) },
          { label: '입금 금액', value: <strong>{formatKRW(due)}</strong> },
          ...(due > 0
            ? [
                { label: '입금 계좌', value: bankTransferInfo ?? '운영팀에 문의해 주세요' },
                { label: '입금자명', value: '브랜드명과 같게 입력해 주세요' },
              ]
            : []),
        ]}
      />
      {billingReady ? (
        <div>
          <Button disabled={pending} onClick={() => void report()} variant="primary">
            {pending ? '알리는 중…' : due > 0 ? '입금했어요' : '잔액으로 시작'}
          </Button>
        </div>
      ) : (
        <p className="cl-alert cl-tone-amber" role="status">
          입금을 알리기 전에 세금계산서 정보를 입력해 주세요.{' '}
          <Link className="cl-link" href="/brand/settings#billing">
            세금계산서 정보 입력
          </Link>
        </p>
      )}
      {failed && (
        <p className="cl-alert cl-tone-tomato" role="alert">
          {failed}
        </p>
      )}
    </div>
  );
}
