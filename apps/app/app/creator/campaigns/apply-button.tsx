'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@clipers/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

export default function ApplyButton({ campaignId, creatorId }: { campaignId: string; creatorId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);

  async function apply() {
    setFailed(false);
    const { error } = await getSupabaseBrowserClient()
      .from('campaign_applications')
      .insert({ campaign_id: campaignId, creator_id: creatorId });
    if (error) {
      setFailed(true);
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <Button
      disabled={pending}
      onClick={() => void apply()}
      title={failed ? '지원하지 못했어요. 다시 시도해 주세요.' : undefined}
      variant="primary"
    >
      {pending ? '지원 중…' : failed ? '다시 시도' : '지원하기'}
    </Button>
  );
}
