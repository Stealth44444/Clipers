'use server';

import { revalidatePath } from 'next/cache';
import { validatePayoutDetails } from '@clipers/db';
import { encryptPii, piiEncryptionReady } from '@/lib/pii-crypto';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export type PayoutDetailsState = { ok: boolean; message: string } | null;

/** Saves the signed-in creator's payout details; the resident number is encrypted before it leaves this server. */
export async function savePayoutDetails(_previous: PayoutDetailsState, form: FormData): Promise<PayoutDetailsState> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: '다시 로그인해 주세요.' };

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'creator') return { ok: false, message: '크리에이터만 지급 정보를 등록할 수 있어요.' };
  if (form.get('consent') !== 'on') return { ok: false, message: '고유식별정보 처리 안내를 확인하고 동의해 주세요.' };

  const result = validatePayoutDetails({
    legalName: String(form.get('legalName') ?? ''),
    bankCode: String(form.get('bankCode') ?? ''),
    accountNumber: String(form.get('accountNumber') ?? ''),
    rrn: String(form.get('rrn') ?? ''),
  });
  if (!result.ok) return { ok: false, message: result.message };
  if (!piiEncryptionReady()) return { ok: false, message: '지금은 지급 정보를 저장할 수 없어요. 운영팀에 문의해 주세요.' };

  const { legalName, bankCode, accountNumber, rrn, birthDate } = result.data;
  const { error } = await getSupabaseAdminClient()
    .from('payout_accounts')
    .upsert({
      creator_id: user.id,
      legal_name: legalName,
      bank_code: bankCode,
      account_number: accountNumber,
      birth_date: birthDate,
      rrn_ciphertext: encryptPii(rrn),
      updated_at: new Date().toISOString(),
    });
  if (error) return { ok: false, message: '저장하지 못했어요. 잠시 후 다시 시도해 주세요.' };

  revalidatePath('/creator/settings');
  revalidatePath('/creator/earnings');
  return { ok: true, message: '지급 정보를 저장했어요.' };
}
