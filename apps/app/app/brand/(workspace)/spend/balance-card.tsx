'use client';

import { useActionState } from 'react';
import { BANKS, refundTransferAmount, type BalanceSummary } from '@clipers/db';
import { Button, Card, Field, Input, Select, SummaryList, formatKRW } from '@clipers/ui';
import { requestRefund, type RefundRequestState } from './refund-actions';

/** The brand balance, and a form to ask for the returnable part of it. */
export default function BalanceCard({ summary, openRequest }: { summary: BalanceSummary; openRequest: { transferAmount: number } | null }) {
  const [state, formAction, pending] = useActionState<RefundRequestState, FormData>(requestRefund, null);

  return (
    <Card description="중단한 캠페인에서 남은 서비스 대금이에요. 반환을 요청하거나 다음 캠페인 입금 때 쓸 수 있어요." id="balance" title="잔액">
      <div className="cl-stack-tight">
        <SummaryList
          rows={[
            { label: '잔액', value: <strong>{formatKRW(summary.balance)}</strong> },
            { label: '반환할 수 있는 금액', value: formatKRW(summary.refundable) },
            ...(summary.campaignOnly > 0
              ? [{ label: '다음 캠페인에만 쓸 수 있는 금액', value: `${formatKRW(summary.campaignOnly)} (확정 후 5년 지남)` }]
              : []),
          ]}
        />
        {openRequest ? (
          <p className="cl-alert cl-tone-amber" role="status">
            {formatKRW(openRequest.transferAmount)} 반환을 처리하고 있어요. 요청한 날부터 영업일 7일 안에 보내 드려요.
          </p>
        ) : state?.ok ? (
          <p className="cl-alert cl-tone-brand" role="status">
            {state.message}
          </p>
        ) : summary.refundable > 0 ? (
          <form action={formAction} className="cl-auth__form">
            <Field
              hint={`부가세를 더해 최대 ${formatKRW(refundTransferAmount(summary.refundable))}을 보내 드려요. 수수료는 없어요.`}
              htmlFor="refund-amount"
              label="반환받을 서비스 대금"
            >
              <Input defaultValue={summary.refundable} id="refund-amount" inputMode="numeric" max={summary.refundable} min={1} name="amount" required type="number" />
            </Field>
            <div className="cl-form-row">
              <Field htmlFor="refund-bank" label="은행">
                <Select defaultValue="" id="refund-bank" name="bankCode" required>
                  <option value="">은행 선택</option>
                  {BANKS.map((bank) => (
                    <option key={bank.code} value={bank.code}>
                      {bank.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field htmlFor="refund-account" label="계좌번호">
                <Input autoComplete="off" id="refund-account" inputMode="numeric" name="accountNumber" placeholder="숫자만 입력" required />
              </Field>
            </div>
            <Field hint="세금계산서의 상호와 같은 명의의 계좌로만 보내 드려요." htmlFor="refund-holder" label="예금주">
              <Input id="refund-holder" maxLength={100} name="accountHolder" required />
            </Field>
            {state && !state.ok && (
              <p className="cl-alert cl-tone-tomato" role="alert">
                {state.message}
              </p>
            )}
            <div>
              <Button disabled={pending} type="submit" variant="primary">
                {pending ? '요청 중…' : '반환 요청'}
              </Button>
            </div>
          </form>
        ) : null}
      </div>
    </Card>
  );
}
