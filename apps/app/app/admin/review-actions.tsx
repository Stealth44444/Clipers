'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { rejectClip, resolveDispute, reviewManualViewReport } from '@clipers/db';
import { Button, Field, Input, Textarea, formatKRW, type ButtonVariant } from '@clipers/ui';
import ActionDialog, { type ActionResult } from '@/components/action-dialog';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

const fail = (message: string): ActionResult => ({ ok: false, message });

/** One-click action that refreshes server data and shows a short inline error when it fails. */
function ActionButton({ label, pendingLabel, variant = 'secondary', run }: {
  label: string;
  pendingLabel: string;
  variant?: ButtonVariant;
  run: () => Promise<ActionResult>;
}) {
  const router = useRouter();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [, startTransition] = useTransition();

  async function click() {
    setWorking(true);
    setError('');
    const result = await run();
    setWorking(false);
    if (!result.ok) return setError(result.message);
    startTransition(() => router.refresh());
  }

  return (
    <Button disabled={working} onClick={() => void click()} size="sm" title={error || undefined} variant={variant}>
      {working ? pendingLabel : error ? '다시 시도' : label}
    </Button>
  );
}

export function ApplicationActions({ applicationId, reviewerId }: { applicationId: string; reviewerId: string }) {
  const decide = (status: 'approved' | 'rejected') => async (): Promise<ActionResult> => {
    const { data, error } = await getSupabaseBrowserClient()
      .from('campaign_applications')
      .update({ status, reviewed_at: new Date().toISOString(), reviewed_by: reviewerId })
      .eq('id', applicationId)
      .eq('status', 'applied')
      .select('id')
      .maybeSingle();
    if (error) return fail('처리하지 못했어요.');
    return data ? { ok: true } : fail('이미 처리된 지원서예요.');
  };
  return (
    <div className="cl-inline">
      <ActionButton label="승인" pendingLabel="승인 중…" run={decide('approved')} variant="primary" />
      <ActionButton label="반려" pendingLabel="반려 중…" run={decide('rejected')} />
    </div>
  );
}

export function ClipReviewActions({ clipId, reviewerId }: { clipId: string; reviewerId: string }) {
  const [reason, setReason] = useState('');
  async function approve(): Promise<ActionResult> {
    const { data, error } = await getSupabaseBrowserClient()
      .from('clips')
      .update({ status: 'approved', rejection_reason: null, reviewed_at: new Date().toISOString(), reviewed_by: reviewerId })
      .eq('id', clipId)
      .eq('status', 'pending_review')
      .select('id')
      .maybeSingle();
    if (error) return fail('승인하지 못했어요.');
    return data ? { ok: true } : fail('이미 검수된 클립이에요.');
  }
  return (
    <div className="cl-inline">
      <ActionButton label="승인" pendingLabel="승인 중…" run={approve} variant="primary" />
      <ActionDialog
        canSubmit={reason.trim().length > 0}
        onSubmit={async () => {
          const result = await rejectClip(getSupabaseBrowserClient(), clipId, reason, reviewerId);
          return result.ok ? { ok: true } : fail(result.message);
        }}
        submitLabel="반려하기"
        submitVariant="danger"
        title="클립 반려"
        trigger="반려"
      >
        <Field count={reason.length} htmlFor={`reject-${clipId}`} label="반려 사유" maxLength={500}>
          <Textarea
            id={`reject-${clipId}`}
            maxLength={500}
            onChange={(event) => setReason(event.target.value)}
            placeholder="크리에이터에게 그대로 보여요. 어떤 요구사항을 지키지 않았는지 구체적으로 적어 주세요."
            value={reason}
          />
        </Field>
      </ActionDialog>
    </div>
  );
}

export function ViewReportActions({ reportId, reviewerId }: { reportId: string; reviewerId: string }) {
  const decide = (decision: 'verified' | 'rejected') => async (): Promise<ActionResult> => {
    const result = await reviewManualViewReport(getSupabaseBrowserClient(), reportId, reviewerId, decision);
    return result.ok ? { ok: true } : fail(result.message);
  };
  return (
    <div className="cl-inline">
      <ActionButton label="확인" pendingLabel="처리 중…" run={decide('verified')} variant="primary" />
      <ActionButton label="반려" pendingLabel="처리 중…" run={decide('rejected')} />
    </div>
  );
}

export function DisputeResolveAction({ disputeId }: { disputeId: string }) {
  const [note, setNote] = useState('');
  return (
    <ActionDialog
      canSubmit={note.trim().length > 0}
      onSubmit={async () => {
        const result = await resolveDispute(getSupabaseBrowserClient(), disputeId, note);
        return result.ok ? { ok: true } : fail(result.message);
      }}
      submitLabel="처리 완료"
      title="이의제기 처리"
      trigger="처리하기"
      triggerVariant="primary"
    >
      <Field count={note.length} htmlFor={`resolve-${disputeId}`} label="처리 결과" maxLength={500}>
        <Textarea
          id={`resolve-${disputeId}`}
          maxLength={500}
          onChange={(event) => setNote(event.target.value)}
          placeholder="크리에이터에게 그대로 보여요. 재검수 결과와 이유를 적어 주세요."
          value={note}
        />
      </Field>
    </ActionDialog>
  );
}

export function ConfirmDepositAction({ campaignId, reviewerId, amount }: { campaignId: string; reviewerId: string; amount: number }) {
  async function confirm(): Promise<ActionResult> {
    if (!window.confirm(`${formatKRW(amount)} 입금을 통장에서 확인했나요? 확인하면 캠페인이 바로 공개돼요.`)) return { ok: true };
    const { data, error } = await getSupabaseBrowserClient()
      .from('campaign_escrow')
      .update({ escrow_status: 'confirmed', confirmed_by: reviewerId, confirmed_at: new Date().toISOString() })
      .eq('campaign_id', campaignId)
      .eq('escrow_status', 'awaiting_manual_confirm')
      .select('campaign_id')
      .maybeSingle();
    if (error) return fail('입금을 확인 처리하지 못했어요.');
    return data ? { ok: true } : fail('이미 처리됐거나 입금 대기 상태가 아니에요.');
  }
  return <ActionButton label="입금 확인" pendingLabel="처리 중…" run={confirm} variant="primary" />;
}

/** Marks a payout paid, after the operator has made the bank transfer; its settlements follow. */
export function PayoutPaidAction({ payoutId, amount, legalName }: { payoutId: string; amount: number; legalName: string }) {
  async function markPaid(): Promise<ActionResult> {
    if (!window.confirm(`${legalName}님 계좌로 ${formatKRW(amount)}을 이체했나요? 이체를 마친 뒤에만 지급 완료로 바꿔 주세요.`)) return { ok: true };
    const { error } = await getSupabaseBrowserClient().rpc('mark_payout_paid', { p_payout_id: payoutId });
    return error ? fail('지급 완료로 바꾸지 못했어요. 새로고침한 뒤 확인해 주세요.') : { ok: true };
  }
  return <ActionButton label="지급 완료" pendingLabel="처리 중…" run={markPaid} variant="primary" />;
}

export function PricingForm({ campaignId, brandCpm, creatorCpm }: { campaignId: string; brandCpm: number; creatorCpm: number }) {
  const router = useRouter();
  const [brand, setBrand] = useState(String(brandCpm));
  const [creator, setCreator] = useState(String(creatorCpm));
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [error, setError] = useState('');
  const [, startTransition] = useTransition();

  const brandValue = Number(brand);
  const creatorValue = Number(creator);
  const invalid =
    !(brandValue > 0) || !(creatorValue > 0)
      ? '단가는 0보다 커야 해요.'
      : creatorValue > brandValue
        ? '크리에이터 단가는 브랜드 단가보다 클 수 없어요.'
        : null;
  const dirty = brandValue !== brandCpm || creatorValue !== creatorCpm;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('saving');
    setError('');
    const { error: updateError } = await getSupabaseBrowserClient()
      .from('campaigns')
      .update({ brand_cpm: brandValue, creator_cpm: creatorValue })
      .eq('id', campaignId);
    if (updateError) {
      setStatus('idle');
      return setError('저장하지 못했어요.');
    }
    setStatus('saved');
    startTransition(() => router.refresh());
  }

  return (
    <form className="cl-auth__form" onSubmit={save}>
      <div className="cl-form-row">
        <Field hint="브랜드 예산이 쓰이는 단가" htmlFor="brand-cpm" label="브랜드 단가 (1천 회당)">
          <Input id="brand-cpm" inputMode="numeric" min={1} onChange={(event) => setBrand(event.target.value)} type="number" value={brand} />
        </Field>
        <Field hint="크리에이터에게 공지되는 단가" htmlFor="creator-cpm" label="크리에이터 단가 (1천 회당)">
          <Input id="creator-cpm" inputMode="numeric" min={1} onChange={(event) => setCreator(event.target.value)} type="number" value={creator} />
        </Field>
      </div>
      <p className="cl-meta">
        플랫폼 수익 1천 회당 {invalid ? '—' : formatKRW(brandValue - creatorValue)}. 이미 생성된 정산에는 영향이 없고 다음 정산부터 적용돼요.
      </p>
      {(invalid || error) && dirty && (
        <p className="cl-alert cl-tone-tomato" role="alert">
          {invalid ?? error}
        </p>
      )}
      <div className="cl-inline">
        <Button disabled={!dirty || !!invalid || status === 'saving'} type="submit" variant="primary">
          {status === 'saving' ? '저장 중…' : '단가 저장'}
        </Button>
        {status === 'saved' && !dirty && <span className="cl-meta">저장했어요</span>}
      </div>
    </form>
  );
}
