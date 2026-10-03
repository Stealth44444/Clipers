'use server';

import { revalidatePath } from 'next/cache';
import { revokeTikTokToken } from '@clipers/db';
import { decryptPii } from '@/lib/pii-crypto';
import { tiktokKeys } from '@/lib/social-oauth';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { getSupabaseServerClient } from '@/lib/supabase-server';

/**
 * Disconnects an account connected through TikTok or Instagram: the token is revoked where the platform allows it,
 * and the account and its tokens are deleted (tokens are kept no longer than the connection).
 */
export async function disconnectChannel(channelId: string): Promise<{ ok: boolean; message: string }> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: '다시 로그인해 주세요.' };

  const admin = getSupabaseAdminClient();
  const { data: channel } = await admin
    .from('creator_channels')
    .select('id, platform, verified_by')
    .eq('id', channelId)
    .eq('creator_id', user.id)
    .maybeSingle();
  if (!channel || channel.verified_by !== 'oauth') return { ok: false, message: '연결된 계정을 찾지 못했어요.' };

  const { data: connection } = await admin.from('channel_connections').select('access_token_ciphertext').eq('channel_id', channelId).maybeSingle();
  const keys = tiktokKeys();
  if (channel.platform === 'tiktok' && connection && keys) {
    try {
      await revokeTikTokToken(keys, decryptPii(connection.access_token_ciphertext));
    } catch {
      // The token is deleted below either way.
    }
  }

  const { error } = await admin.from('creator_channels').delete().eq('id', channelId);
  if (error) return { ok: false, message: '연결을 해제하지 못했어요. 잠시 후 다시 시도해 주세요.' };
  revalidatePath('/creator/settings');
  return { ok: true, message: '연결을 해제했어요. 이 계정의 클립 조회수는 더 이상 자동으로 가져오지 않아요.' };
}
