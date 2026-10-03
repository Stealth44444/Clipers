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
      <PageHeader description="클립을 제출하고 수익금을 받으려면 채널 인증과 계좌 등록이 필요해요." title="설정" />
      <Stack>
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
        <PayoutDetailsCard
          account={
            account
              ? { legalName: account.legal_name, bankCode: account.bank_code, accountNumber: account.account_number, updatedAt: account.updated_at }
              : null
          }
        />
        <SettingsForm email={user.email ?? ''} profile={profile} />
        <NotificationSettingsCard
          initialActivityEmails={preferences?.email_activity_notifications ?? true}
          moneyDescription="정산과 지급 소식은 메일로 항상 보내 드려요."
          profileId={profile.id}
        />
      </Stack>
    </Page>
  );
}
