'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { formatBusinessNumber, validateBillingProfile, type BillingProfile } from '@clipers/db';
import { Button, Card, Field, Input } from '@clipers/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

/** Tax invoice details. Needed before a brand reports a deposit; Clipers issues the invoice from these. */
export default function BillingProfileForm({ brandId, initial }: { brandId: string; initial: BillingProfile | null }) {
  const router = useRouter();
  const [form, setForm] = useState<BillingProfile>(
    initial ? { ...initial, businessNumber: formatBusinessNumber(initial.businessNumber) } : { businessNumber: '', companyName: '', representative: '', invoiceEmail: '' }
  );
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [error, setError] = useState('');
  const [, startTransition] = useTransition();
  const update = (patch: Partial<BillingProfile>) => {
    setForm((current) => ({ ...current, ...patch }));
    setStatus('idle');
  };

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const result = validateBillingProfile(form);
    if (!result.ok) return setError(result.message);
    setStatus('saving');
    const { error: saveError } = await getSupabaseBrowserClient()
      .from('brand_billing_profiles')
      .upsert({
        brand_id: brandId,
        business_number: result.data.businessNumber,
        company_name: result.data.companyName,
        representative: result.data.representative,
        invoice_email: result.data.invoiceEmail,
        updated_at: new Date().toISOString(),
      });
    if (saveError) {
      setStatus('idle');
      return setError('저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
    }
    setStatus('saved');
    startTransition(() => router.refresh());
  }

  return (
    <Card description="캠페인 입금마다 이 정보로 세금계산서를 발행해요. 입금을 알리기 전에 입력해 주세요." id="billing" title="세금계산서 정보">
      <form className="cl-auth__form" onSubmit={save}>
        <div className="cl-form-row">
          <Field htmlFor="billing-number" label="사업자등록번호">
            <Input
              id="billing-number"
              inputMode="numeric"
              maxLength={12}
              onChange={(event) => update({ businessNumber: event.target.value })}
              placeholder="000-00-00000"
              required
              value={form.businessNumber}
            />
          </Field>
          <Field htmlFor="billing-company" label="상호">
            <Input id="billing-company" maxLength={100} onChange={(event) => update({ companyName: event.target.value })} required value={form.companyName} />
          </Field>
        </div>
        <div className="cl-form-row">
          <Field htmlFor="billing-representative" label="대표자">
            <Input id="billing-representative" maxLength={40} onChange={(event) => update({ representative: event.target.value })} required value={form.representative} />
          </Field>
          <Field htmlFor="billing-email" label="세금계산서 받을 이메일">
            <Input id="billing-email" maxLength={200} onChange={(event) => update({ invoiceEmail: event.target.value })} required type="email" value={form.invoiceEmail} />
          </Field>
        </div>
        {error && (
          <p className="cl-alert cl-tone-tomato" role="alert">
            {error}
          </p>
        )}
        <div className="cl-inline">
          <Button disabled={status === 'saving'} type="submit" variant="primary">
            {status === 'saving' ? '저장 중…' : '저장'}
          </Button>
          {status === 'saved' && <span className="cl-meta">저장했어요</span>}
        </div>
      </form>
    </Card>
  );
}
