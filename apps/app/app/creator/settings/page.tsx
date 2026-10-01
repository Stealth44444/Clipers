import { Page, PageHeader, Stack } from '@clipers/ui';
import { getSession } from '@/lib/session';
import PayoutDetailsCard from './payout-details-card';
import SettingsForm from './settings-form';

export default async function CreatorSettingsPage() {
  const { supabase, user, profile } = await getSession();
  const { data: account } = await supabase
    .from('payout_accounts')
    .select('legal_name, bank_code, account_number, updated_at')
    .eq('creator_id', user.id)
    .maybeSingle();

  return (
    <Page>
      <PageHeader description="프로필과 관심 분야를 바꾸면 추천 캠페인에 반영돼요." title="설정" />
      <Stack>
        <SettingsForm email={user.email ?? ''} profile={profile} />
        <PayoutDetailsCard
          account={
            account
              ? { legalName: account.legal_name, bankCode: account.bank_code, accountNumber: account.account_number, updatedAt: account.updated_at }
              : null
          }
        />
      </Stack>
    </Page>
  );
}
