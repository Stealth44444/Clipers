import type { SupabaseClient } from '@supabase/supabase-js';
import { err, ok, type ServiceResult } from './errors';

export async function fileDispute(
  supabase: SupabaseClient,
  clipId: string,
  creatorId: string,
  reason: string
): Promise<ServiceResult<{ id: string }>> {
  if (!reason || reason.trim().length === 0) {
    return err('dispute_reason_required', '이의제기 사유를 반드시 입력해야 합니다.');
  }

  const { data, error } = await supabase
    .from('clip_disputes')
    .insert({ clip_id: clipId, creator_id: creatorId, reason })
    .select('id')
    .single();

  if (error) {
    return err('db_error', error.message);
  }

  return ok({ id: (data as { id: string }).id });
}

export async function resolveDispute(
  supabase: SupabaseClient,
  disputeId: string,
  resolutionNote: string
): Promise<ServiceResult<{ id: string }>> {
  if (!resolutionNote || resolutionNote.trim().length === 0) {
    return err('resolution_note_required', '처리 결과를 반드시 입력해야 합니다.');
  }

  const { data, error } = await supabase
    .from('clip_disputes')
    .update({
      status: 'resolved',
      resolution_note: resolutionNote,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', disputeId)
    .select('id')
    .single();

  if (error) {
    return err('db_error', error.message);
  }

  return ok({ id: (data as { id: string }).id });
}
