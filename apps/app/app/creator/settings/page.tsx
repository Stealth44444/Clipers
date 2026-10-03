import { Page, PageHeader, Stack } from '@clipers/ui';
import NotificationSettingsCard from '@/components/notification-settings-card';
import { getSession } from '@/lib/session';
import { connectablePlatforms } from '@/lib/social-oauth';
import ChannelsCard from './channels-card';
import PayoutDetailsCard from './payout-details-card';
import SettingsForm from './settings-form';

export default async function CreatorSettingsPage({ searchParams }: { searchParams: Promise<{ connect?: string }> }) {
  const { connect } = await searchParams;
  const { supabase, user, profile } = await getSession();
  const [{ data: account }, { data: channels }] = await Promise.all([
    supabase.from('payout_accounts').select('legal_name, bank_code, account_number, updated_at').eq('creator_id', user.id).maybeSingle(),
    supabase.from('creator_channels').select('id, platform, url, verification_code, verified_at, verified_by').eq('creator_id', user.id).order('created_at'),
  ]);
  const { data: preferences } = await supabase.from('profiles').select('email_activity_notifications').eq('id', user.id).maybeSingle();

  return (
    <Page>
      <PageHeader description="프로필과 관심 분야를 바꾸면 추천 캠페인에 반영돼요." title="설정" />
      <Stack>
        <SettingsForm email={user.email ?? ''} profile={profile} />
        <ChannelsCard
          channels={(channels ?? []).map((channel) => ({
            id: channel.id,
            platform: channel.platform,
            url: channel.url,
            verificationCode: channel.verification_code,
            verifiedAt: channel.verified_at,
            verifiedBy: channel.verified_by,
          }))}
          connectResult={connect}
          connectable={connectablePlatforms()}
        />
        <NotificationSettingsCard
          initialActivityEmails={preferences?.email_activity_notifications ?? true}
          moneyDescription="정산과 지급 소식은 메일로 항상 보내 드려요."
          profileId={profile.id}
        />
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
