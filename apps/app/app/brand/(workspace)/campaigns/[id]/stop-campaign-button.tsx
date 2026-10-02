'use client';

import ActionDialog, { type ActionResult } from '@/components/action-dialog';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

/** Stops a live campaign for good; its approved clips are settled through this week, then the leftover is fixed. */
export default function StopCampaignButton({ campaignId }: { campaignId: string }) {
  async function stop(): Promise<ActionResult> {
    const { error } = await getSupabaseBrowserClient().rpc('stop_campaign', { p_campaign_id: campaignId });
    return error ? { ok: false, message: '중단하지 못했어요. 새로고침한 뒤 다시 시도해 주세요.' } : { ok: true };
  }

  return (
    <ActionDialog canSubmit onSubmit={stop} submitLabel="중단" submitVariant="danger" title="캠페인 중단" trigger="캠페인 중단">
      <p>중단하면 바로 마켓에서 내려가고 새 클립을 받지 않아요. 검수를 기다리던 클립은 반려돼요. 중단한 캠페인은 다시 열 수 없어요.</p>
      <p className="cl-meta">
        지금까지 승인된 클립은 이번 주 조회수까지 정산돼요. 다음 월요일 정산이 끝나면 남은 금액이 잔액으로 옮겨지고, 반환을 요청하거나 다음 캠페인에 쓸 수 있어요.
      </p>
    </ActionDialog>
  );
}
