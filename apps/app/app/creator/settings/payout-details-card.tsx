'use client';

import { useActionState, useState } from 'react';
import { BANKS, bankName, maskAccountNumber } from '@clipers/db';
import { Button, Card, Field, Input, Select, SummaryList } from '@clipers/ui';
import { savePayoutDetails, type PayoutDetailsState } from './payout-actions';

export type PayoutAccountSummary = { legalName: string; bankCode: string; accountNumber: string; updatedAt: string };

/** Where a creator registers the account payouts go to. Shown masked once saved; changing it means entering it all again. */
export default function PayoutDetailsCard({ account }: { account: PayoutAccountSummary | null }) {
  const [editing, setEditing] = useState(!account);
  const [state, formAction, pending] = useActionState<PayoutDetailsState, FormData>(async (previous, form) => {
    const result = await savePayoutDetails(previous, form);
    if (result?.ok) setEditing(false);
    return result;
  }, null);

  return (
    <Card
      actions={
        account && !editing ? (
          <Button onClick={() => setEditing(true)} size="sm" variant="secondary">
            변경
          </Button>
        ) : undefined
      }
      description="지급 요청한 금액을 이 계좌로 보내요. 본인 명의 계좌만 등록할 수 있어요."
      id="payout"
      title="지급 정보"
    >
      {account && !editing ? (
        <>
          <SummaryList
            rows={[
              { label: '예금주', value: account.legalName },
              { label: '계좌', value: `${bankName(account.bankCode)} ${maskAccountNumber(account.accountNumber)}` },
              { label: '주민등록번호', value: '등록됨 (암호화해 보관 중)' },
            ]}
          />
          {state?.ok && (
            <p className="cl-alert cl-tone-brand" role="status">
              {state.message}
            </p>
          )}
        </>
      ) : (
        <form action={formAction} className="cl-auth__form">
          <Field hint="계좌 예금주와 같은 이름이어야 해요." htmlFor="payout-name" label="실명">
            <Input autoComplete="name" defaultValue={account?.legalName} id="payout-name" maxLength={40} name="legalName" required />
          </Field>
          <div className="cl-form-row">
            <Field htmlFor="payout-bank" label="은행">
              <Select defaultValue={account?.bankCode ?? ''} id="payout-bank" name="bankCode" required>
                <option value="">은행 선택</option>
                {BANKS.map((bank) => (
                  <option key={bank.code} value={bank.code}>
                    {bank.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field htmlFor="payout-account" label="계좌번호">
              <Input autoComplete="off" id="payout-account" inputMode="numeric" name="accountNumber" placeholder="숫자만 입력" required />
            </Field>
          </div>
          <Field hint="원천징수 신고에 필요해요. 암호화해 보관하고, 신고할 때만 사용해요." htmlFor="payout-rrn" label="주민등록번호">
            <Input autoComplete="off" id="payout-rrn" inputMode="numeric" maxLength={14} name="rrn" placeholder="000000-0000000" required type="password" />
          </Field>
          <p className="cl-meta">
            Clipers는 크리에이터에게 지급하는 금액에서 사업소득세 3.3%를 원천징수하고 국세청에 신고해요(지급액이 33,334원 미만이면 떼지 않아요).
            이를 위해 소득세법에 따라 주민등록번호를 처리하며, 마지막 지급 후 5년 동안 보관한 뒤 파기해요. 만 19세 이상 개인만 등록할 수 있어요.
          </p>
          <label className="cl-inline">
            <input name="consent" required type="checkbox" /> 위 안내를 확인했고, 지급과 세금 신고를 위한 개인정보·고유식별정보 처리에 동의해요.
          </label>
          {state && !state.ok && (
            <p className="cl-alert cl-tone-tomato" role="alert">
              {state.message}
            </p>
          )}
          <div className="cl-inline">
            <Button disabled={pending} type="submit" variant="primary">
              {pending ? '저장 중…' : '저장'}
            </Button>
            {account && (
              <Button onClick={() => setEditing(false)} type="button" variant="secondary">
                취소
              </Button>
            )}
          </div>
        </form>
      )}
    </Card>
  );
}
