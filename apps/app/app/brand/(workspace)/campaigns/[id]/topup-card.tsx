'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MIN_TOPUP, depositDue, validateTopUp, vatOn } from '@clipers/db';
import { Button, Card, Field, Input, SummaryList, formatKRW } from '@clipers/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

const FAILED: Record<string, string> = {
  topup_open: '이미 확인을 기다리는 증액이 있어요.',
  credit_too_large: '잔액이 바뀌었어요. 새로고침한 뒤 다시 시도해 주세요.',
  billing_profile_missing: '입금을 알리기 전에 세금계산서 정보를 입력해 주세요.',
  not_toppable: '이 캠페인은 예산을 늘릴 수 없어요.',
};

export type PendingTopUp = { amount: number; credit: number; received: number };

/** Adds budget to a live campaign, or reopens one that spent its budget. Paid like the first deposit. */
export default function TopUpCard({ campaignId, balance, bankTransferInfo, billingReady, reopens, pending }: {
  campaignId: string;
  balance: number;
  bankTransferInfo: string | null;
  billingReady: boolean;
  /** The campaign closed because its budget ran out; a top-up opens it again. */
  reopens: boolean;
  pending: PendingTopUp | null;
}) {
  const router = useRouter();
  const [pendingRefresh, startTransition] = useTransition();
  const [open, setOpen] = useState(reopens);
  const [amountText, setAmountText] = useState('');
  const [creditText, setCreditText] = useState('');
  const [error, setError] = useState('');

  if (pending) {
    const due = depositDue(pending.amount, pending.credit);
    const short = pending.received > 0 && pending.received < due;
    return (
      <Card title="예산 늘리기">
        <p className="cl-alert cl-tone-amber" role="status">
          {short
            ? `${formatKRW(pending.received)}이 확인됐어요. 차액 ${formatKRW(due - pending.received)}을 더 입금해 주세요.`
            : `${formatKRW(pending.amount)} 증액 입금(${formatKRW(due)})을 운영팀이 확인하고 있어요. 확인되면 예산에 더해져요.`}
        </p>
      </Card>
    );
  }

  const amount = Math.floor(Number(amountText) || 0);
  const credit = Math.floor(Number(creditText) || 0);
  const cash = Math.max(0, amount - credit);
  const due = depositDue(amount, credit);
  const check = validateTopUp(amount, credit, balance);

  async function submit() {
    setError('');
    if (!check.ok) return setError(check.message);
    const { error: rpcError } = await getSupabaseBrowserClient().rpc('request_topup', { p_campaign_id: campaignId, p_amount: amount, p_credit: credit });
    if (rpcError) return setError(FAILED[rpcError.hint ?? ''] ?? '요청을 보내지 못했어요. 새로고침한 뒤 다시 시도해 주세요.');
    startTransition(() => router.refresh());
  }

  return (
    <Card
      actions={
        !open ? (
          <Button onClick={() => setOpen(true)} size="sm" variant="secondary">
            예산 늘리기
          </Button>
        ) : undefined
      }
      description={
        reopens
          ? '예산을 모두 써서 종료된 캠페인이에요. 예산을 늘리면 입금 확인 뒤 다시 진행돼요.'
          : `${formatKRW(MIN_TOPUP)}부터 늘릴 수 있어요. 입금이 확인되면 예산과 최대 조회수가 늘어나요.`
      }
      title="예산 늘리기"
    >
      {open && (
        <div className="cl-stack-tight">
          <div className="cl-form-row">
            <Field hint={`${formatKRW(MIN_TOPUP)}부터, 부가세 별도`} htmlFor={`topup-${campaignId}`} label="늘릴 금액">
              <Input id={`topup-${campaignId}`} inputMode="numeric" min={MIN_TOPUP} onChange={(event) => setAmountText(event.target.value)} type="number" value={amountText} />
            </Field>
            {balance > 0 && (
              <Field hint={`잔액 ${formatKRW(balance)}`} htmlFor={`topup-credit-${campaignId}`} label="잔액 사용">
                <Input
                  id={`topup-credit-${campaignId}`}
                  inputMode="numeric"
                  max={balance}
                  min={0}
                  onChange={(event) => setCreditText(event.target.value)}
                  type="number"
                  value={creditText}
                />
              </Field>
            )}
          </div>
          {amount > 0 && (
            <SummaryList
              rows={[
                { label: '늘릴 금액', value: formatKRW(amount) },
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
          )}
          {billingReady ? (
            <div>
              <Button disabled={pendingRefresh || amount <= 0} onClick={() => void submit()} variant="primary">
                {pendingRefresh ? '알리는 중…' : due > 0 ? '입금했어요' : '잔액으로 늘리기'}
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
          {error && (
            <p className="cl-alert cl-tone-tomato" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
