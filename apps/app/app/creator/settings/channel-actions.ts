'use server';

import { revalidatePath } from 'next/cache';
import { channelPlatformOf, descriptionHasCode, fetchYouTubeChannel, newVerificationCode, parseChannelUrl } from '@clipers/db';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { getSupabaseServerClient } from '@/lib/supabase-server';

// creator_channels is written only here (service key) and by operators, so a creator can't mark an account verified.

export type ChannelActionState = { ok: boolean; message: string } | null;

async function signedInCreatorId(): Promise<string | null> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  return profile?.role === 'creator' ? user.id : null;
}

/** Registers an account and gives it a code to put in the channel description or profile bio. */
export async function addChannel(_previous: ChannelActionState, form: FormData): Promise<ChannelActionState> {
  const creatorId = await signedInCreatorId();
  if (!creatorId) return { ok: false, message: '다시 로그인해 주세요.' };

  // The form asks for the address alone; its host says which platform it is.
  const input = String(form.get('url') ?? '');
  const platform = channelPlatformOf(input);
  if (!platform) {
    return {
      ok: false,
      message: '등록할 수 있는 플랫폼의 주소가 아니에요. 유튜브, 틱톡, 인스타그램, 페이스북, X, 네이버 클립, 카카오 숏폼의 프로필 주소를 붙여 넣어 주세요.',
    };
  }
  const parsed = parseChannelUrl(platform, input);
  if (!parsed) {
    return {
      ok: false,
      message:
        platform === 'youtube_shorts'
          ? '채널 주소를 확인해 주세요. youtube.com/@핸들 또는 youtube.com/channel/UC… 형식이에요.'
          : '계정 주소를 확인해 주세요. 내 프로필 페이지 주소를 붙여 넣으면 돼요.',
    };
  }

  const { error } = await getSupabaseAdminClient()
    .from('creator_channels')
    .insert({ creator_id: creatorId, platform, url: parsed.url, verification_code: newVerificationCode() });
  if (error) return { ok: false, message: error.code === '23505' ? '이미 등록한 계정이에요.' : '등록하지 못했어요. 잠시 후 다시 시도해 주세요.' };

  revalidatePath('/creator/settings');
  return { ok: true, message: '등록했어요. 위 안내대로 인증 코드를 프로필에 넣어 주세요.' };
}

/** Checks the YouTube channel description for the code and marks the channel verified. */
export async function verifyYouTubeChannel(channelRowId: string): Promise<{ ok: boolean; message: string }> {
  const creatorId = await signedInCreatorId();
  if (!creatorId) return { ok: false, message: '다시 로그인해 주세요.' };

  const admin = getSupabaseAdminClient();
  const { data: row } = await admin
    .from('creator_channels')
    .select('id, platform, url, verification_code, verified_at')
    .eq('id', channelRowId)
    .eq('creator_id', creatorId)
    .maybeSingle();
  if (!row || row.platform !== 'youtube_shorts') return { ok: false, message: '채널을 찾을 수 없어요.' };
  if (row.verified_at) return { ok: true, message: '이미 인증된 채널이에요.' };

  const ref = parseChannelUrl('youtube_shorts', row.url)?.youtube;
  if (!ref) return { ok: false, message: '채널 주소를 확인해 주세요.' };
  const channel = await fetchYouTubeChannel(ref, process.env.YOUTUBE_DATA_API_KEY ?? '');
  if (!channel.ok) return { ok: false, message: '지금은 유튜브 채널을 확인할 수 없어요. 잠시 뒤 다시 시도해 주세요.' };
  if (!channel.data) return { ok: false, message: '채널을 찾을 수 없어요. 주소를 확인해 주세요.' };
  if (!descriptionHasCode(channel.data.description, row.verification_code)) {
    return { ok: false, message: '채널 설명에서 코드를 찾지 못했어요. 설명을 저장했는지 확인한 뒤 다시 눌러 주세요.' };
  }

  const { error } = await admin
    .from('creator_channels')
    .update({ external_id: channel.data.channelId, verified_at: new Date().toISOString(), verified_by: 'auto' })
    .eq('id', row.id)
    .is('verified_at', null);
  if (error) {
    return {
      ok: false,
      message: error.code === '23505' ? '이 채널은 이미 다른 계정에서 인증했어요. 운영팀에 문의해 주세요.' : '인증하지 못했어요. 잠시 후 다시 시도해 주세요.',
    };
  }

  revalidatePath('/creator/settings');
  return { ok: true, message: '채널을 인증했어요.' };
}

/** Removes an account that isn't verified yet; a verified one is released only by the operations team. */
export async function removeChannel(channelRowId: string): Promise<{ ok: boolean; message: string }> {
  const creatorId = await signedInCreatorId();
  if (!creatorId) return { ok: false, message: '다시 로그인해 주세요.' };
  const { error } = await getSupabaseAdminClient()
    .from('creator_channels')
    .delete()
    .eq('id', channelRowId)
    .eq('creator_id', creatorId)
    .is('verified_at', null);
  if (error) return { ok: false, message: '삭제하지 못했어요. 잠시 후 다시 시도해 주세요.' };
  revalidatePath('/creator/settings');
  return { ok: true, message: '삭제했어요.' };
}
