import type { SupabaseClient } from '@supabase/supabase-js';
import { err, ok, type ServiceResult } from './errors';

export async function rejectClip(
  supabase: SupabaseClient,
  clipId: string,
  reason: string,
  reviewerId: string
): Promise<ServiceResult<{ id: string }>> {
  const trimmedReason = reason?.trim() ?? '';
  if (!trimmedReason) {
    return err('rejection_reason_required', '반려 사유를 반드시 입력해야 합니다.');
  }

  const { data, error } = await supabase
    .from('clips')
    .update({
      status: 'rejected',
      rejection_reason: trimmedReason,
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewerId,
    })
    .eq('id', clipId)
    .select('id')
    .single();

  if (error) {
    return err('db_error', error.message);
  }

  return ok({ id: (data as { id: string }).id });
}
