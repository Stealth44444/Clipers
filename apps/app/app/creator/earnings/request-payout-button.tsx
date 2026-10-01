'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@clipers/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

export default function RequestPayoutButton({ settlementId }: { settlementId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);

  async function request() {
    setFailed(false);
    // Guarded on status so a stale screen can't re-request an already processed settlement.
    const { data, error } = await getSupabaseBrowserClient()
      .from('settlements')
      .update({ status: 'requested' })
      .eq('id', settlementId)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle();
    if (error || !data) setFailed(true);
    startTransition(() => router.refresh());
  }

  return (
    <Button
      disabled={pending}
      onClick={() => void request()}
      size="sm"
      title={failed ? '요청하지 못했어요. 새로고침 후 다시 확인해 주세요.' : undefined}
      variant="secondary"
    >
      {pending ? '요청 중…' : failed ? '다시 시도' : '지급 요청'}
    </Button>
  );
}
