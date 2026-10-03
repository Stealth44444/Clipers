'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { rejectClip, resolveDispute, reviewManualViewReport } from '@clipers/db';
import { Button, Field, Input, Textarea, formatKRW, type ButtonVariant } from '@clipers/ui';
import ActionDialog, { type ActionResult } from '@/components/action-dialog';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

const fail = (message: string): ActionResult => ({ ok: false, message });

/** One-click action that refreshes server data and shows a short inline error when it fails. */
function ActionButton({ label, pendingLabel, variant = 'secondary', disabled = false, run }: {
  label: string;
  pendingLabel: string;
  variant?: ButtonVariant;
  disabled?: boolean;
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
    <Button disabled={working || disabled} onClick={() => void click()} size="sm" title={error || undefined} variant={variant}>
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

/** Verifies a non-YouTube account after the operator saw the code in its bio, or rejects (removes) the registration. */
export function ChannelVerifyActions({ channelId }: { channelId: string }) {
  async function verify(): Promise<ActionResult> {
    const { data, error } = await getSupabaseBrowserClient()
      .from('creator_channels')
      .update({ verified_at: new Date().toISOString(), verified_by: 'admin' })
      .eq('id', channelId)
      .is('verified_at', null)
      .select('id')
      .maybeSingle();
    if (error) return fail(error.code === '23505' ? '같은 계정을 이미 다른 크리에이터가 인증했어요.' : '인증하지 못했어요.');
    return data ? { ok: true } : fail('이미 처리된 계정이에요.');
  }
  async function reject(): Promise<ActionResult> {
    if (!window.confirm('소개에서 코드를 찾지 못했나요? 거절하면 등록이 지워지고, 크리에이터는 다시 등록할 수 있어요.')) return { ok: true };
    const { error } = await getSupabaseBrowserClient().from('creator_channels').delete().eq('id', channelId).is('verified_at', null);
    return error ? fail('거절하지 못했어요.') : { ok: true };
  }
  return (
    <div className="cl-inline">
      <ActionButton label="인증" pendingLabel="처리 중…" run={verify} variant="primary" />
      <ActionButton label="거절" pendingLabel="처리 중…" run={reject} />
    </div>
  );
}

/** Releases a verified account, e.g. when the creator asks or the account changed hands. */
export function ChannelRevokeAction({ channelId }: { channelId: string }) {
  async function revoke(): Promise<ActionResult> {
    if (!window.confirm('인증을 해제할까요? 이 계정의 새 클립은 다시 인증하기 전까지 받을 수 없어요.')) return { ok: true };
    const { error } = await getSupabaseBrowserClient()
      .from('creator_channels')
      .update({ verified_at: null, verified_by: null, external_id: null })
      .eq('id', channelId);
    return error ? fail('해제하지 못했어요.') : { ok: true };
  }
  return <ActionButton label="인증 해제" pendingLabel="처리 중…" run={revoke} />;
}

export type ClipManualChecks = {
  /** When the campaign went live (videos posted earlier don't count). */
  liveAt: string | null;
  /** The creator's verified accounts on the clip's platform. */
  accounts: string[];
};

const shortDate = (value: string) => new Date(value).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' });

/**
 * Approve or reject a clip. Clips the server didn't check against YouTube (other platforms, and YouTube clips from
 * before that check) need the operator to confirm the posting time and the account first.
 */
export function ClipReviewActions({ clipId, reviewerId, manualChecks }: { clipId: string; reviewerId: string; manualChecks: ClipManualChecks | null }) {
  const [reason, setReason] = useState('');
  const [postedAfterLive, setPostedAfterLive] = useState(false);
  const [fromVerifiedAccount, setFromVerifiedAccount] = useState(false);
  const checked = !manualChecks || (postedAfterLive && fromVerifiedAccount);

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
    <div className="cl-review-actions">
      {manualChecks && (
        <div className="cl-review-checks">
          <label className="cl-inline cl-meta">
            <input checked={postedAfterLive} onChange={(event) => setPostedAfterLive(event.target.checked)} type="checkbox" />
            캠페인 공개({manualChecks.liveAt ? shortDate(manualChecks.liveAt) : '날짜 없음'}) 이후 게시
          </label>
          <label className="cl-inline cl-meta">
            <input
              checked={fromVerifiedAccount}
              disabled={manualChecks.accounts.length === 0}
              onChange={(event) => setFromVerifiedAccount(event.target.checked)}
              type="checkbox"
            />
            인증된 계정의 게시물
          </label>
          <p className="cl-meta-subtle">
            {manualChecks.accounts.length > 0
              ? `인증된 계정: ${manualChecks.accounts.map((url) => url.replace(/^https:\/\//, '')).join(', ')}`
              : '이 플랫폼에 인증된 계정이 없어요. 반려 사유에 계정 인증을 안내해 주세요.'}
          </p>
        </div>
      )}
      <div className="cl-inline">
        <ActionButton disabled={!checked} label="승인" pendingLabel="승인 중…" run={approve} variant="primary" />
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
    </div>
  );
}

/** Stops (or resumes) a clip's settlement after the operator checked its video by hand. */
export function ClipAvailabilityAction({ clipId, unavailable }: { clipId: string; unavailable: boolean }) {
  async function run(): Promise<ActionResult> {
    const question = unavailable
      ? '영상이 다시 공개된 것을 확인했나요? 표시를 지우면 다음 정산부터 다시 포함돼요.'
      : '영상이 삭제됐거나 공개 상태가 아닌 것을 확인했나요? 표시한 날이 속한 주부터 정산에서 빠져요.';
    if (!window.confirm(question)) return { ok: true };
    const { error } = await getSupabaseBrowserClient()
      .from('clips')
      .update(unavailable ? { unavailable_at: null, unavailable_reason: null } : { unavailable_at: new Date().toISOString(), unavailable_reason: 'manual' })
      .eq('id', clipId)
      .eq('status', 'approved');
    return error ? fail('바꾸지 못했어요. 새로고침한 뒤 확인해 주세요.') : { ok: true };
  }
  return <ActionButton label={unavailable ? '표시 해제' : '삭제·비공개로 표시'} pendingLabel="처리 중…" run={run} />;
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

const DEPOSIT_RESULT: Record<string, string> = {
  short: '아직 모자라요. 브랜드 화면에 차액 입금을 안내했어요.',
  over: '처리했어요. 초과분은 반환 화면에 올라갔어요.',
};

/** What a deposit pays for: a campaign's first deposit, or one budget top-up. */
export type DepositTarget = { campaignId: string } | { topupId: string };

const recordDeposit = (target: DepositTarget, amount: number) =>
  'topupId' in target
    ? getSupabaseBrowserClient().rpc('record_topup', { p_topup_id: target.topupId, p_amount: amount })
    : getSupabaseBrowserClient().rpc('record_deposit', { p_campaign_id: target.campaignId, p_amount: amount });

/** Records the remaining due amount as received; the campaign goes live, or the top-up joins its budget. */
export function ConfirmDepositAction({ target, amount }: { target: DepositTarget; amount: number }) {
  async function confirm(): Promise<ActionResult> {
    const effect = 'topupId' in target ? '예산에 바로 더해져요' : '캠페인이 바로 공개돼요';
    const question = amount > 0 ? `${formatKRW(amount)} 입금을 통장에서 확인했나요? 확인하면 ${effect}.` : `잔액으로 낸 건이에요. 확인하면 ${effect}.`;
    if (!window.confirm(question)) return { ok: true };
    const { error } = await recordDeposit(target, amount);
    return error ? fail('입금을 확인 처리하지 못했어요. 새로고침한 뒤 확인해 주세요.') : { ok: true };
  }
  return <ActionButton label="입금 확인" pendingLabel="처리 중…" run={confirm} variant="primary" />;
}

/** Records a different amount than asked: short keeps the campaign waiting, over queues the excess for return. */
export function DepositMismatchAction({ target, remaining }: { target: DepositTarget; remaining: number }) {
  const [amount, setAmount] = useState('');
  const value = Math.floor(Number(amount));
  const fieldId = `deposit-${'topupId' in target ? target.topupId : target.campaignId}`;
  return (
    <ActionDialog
      canSubmit={Number.isFinite(value) && value > 0 && value !== remaining}
      onSubmit={async () => {
        const { data, error } = await recordDeposit(target, value);
        if (error) return fail('기록하지 못했어요. 새로고침한 뒤 확인해 주세요.');
        if (DEPOSIT_RESULT[data as string]) window.alert(DEPOSIT_RESULT[data as string]);
        return { ok: true };
      }}
      submitLabel="기록"
      title="받은 금액 기록"
      trigger="금액이 달라요"
    >
      <Field hint={`남은 안내 금액은 ${formatKRW(remaining)}이에요. 이번에 통장에서 확인한 금액(부가세 포함)을 적어 주세요.`} htmlFor={fieldId} label="확인한 금액">
        <Input id={fieldId} inputMode="numeric" min={1} onChange={(event) => setAmount(event.target.value)} type="number" value={amount} />
      </Field>
    </ActionDialog>
  );
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

/** Marks a return sent, after the operator has made the bank transfer. */
export function RefundPaidAction({ refundId, amount }: { refundId: string; amount: number }) {
  async function markPaid(): Promise<ActionResult> {
    if (!window.confirm(`${formatKRW(amount)}을 이체했나요? 이체를 마친 뒤에만 반환 완료로 바꿔 주세요.`)) return { ok: true };
    const { error } = await getSupabaseBrowserClient().rpc('mark_refund_paid', { p_refund_id: refundId });
    return error ? fail('반환 완료로 바꾸지 못했어요. 새로고침한 뒤 확인해 주세요.') : { ok: true };
  }
  return <ActionButton label="반환 완료" pendingLabel="처리 중…" run={markPaid} variant="primary" />;
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
