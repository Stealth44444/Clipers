'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@clipers/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

export default function DepositButton({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);

  async function markDeposited() {
    setFailed(false);
    // Guarded on status so a stale screen can't move a campaign that already left draft.
    const { data, error } = await getSupabaseBrowserClient()
      .from('campaigns')
      .update({ status: 'pending_escrow' })
      .eq('id', campaignId)
      .eq('status', 'draft')
      .select('id')
      .maybeSingle();
    if (error || !data) setFailed(true);
    startTransition(() => router.refresh());
  }

  return (
    <>
      <Button disabled={pending} onClick={() => void markDeposited()} variant="primary">
        {pending ? '알리는 중…' : '입금했어요'}
      </Button>
      {failed && (
        <p className="cl-alert cl-tone-tomato" role="alert">
          상태를 바꾸지 못했어요. 새로고침한 뒤 다시 시도해 주세요.
        </p>
      )}
    </>
  );
}
