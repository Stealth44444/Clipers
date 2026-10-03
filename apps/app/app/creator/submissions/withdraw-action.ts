'use server';

import { revalidatePath } from 'next/cache';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { getSupabaseServerClient } from '@/lib/supabase-server';

/**
 * Withdraws a clip the creator submitted, while it still waits for review. The row is deleted, so the same video can
 * be submitted again; once reviewed, a clip stays (a rejection is contested with a dispute instead).
 */
export async function withdrawClip(clipId: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: '다시 로그인해 주세요.' };

  const { data, error } = await getSupabaseAdminClient()
    .from('clips')
    .delete()
    .eq('id', clipId)
    .eq('creator_id', user.id)
    .eq('status', 'pending_review')
    .select('id');
  if (error) return { ok: false, message: '제출을 취소하지 못했어요. 잠시 후 다시 시도해 주세요.' };
  if (!data?.length) return { ok: false, message: '검수가 끝난 클립은 취소할 수 없어요.' };

  revalidatePath('/creator/submissions');
  revalidatePath('/creator');
  return { ok: true };
}
