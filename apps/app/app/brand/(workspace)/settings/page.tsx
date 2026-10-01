import { Page, PageHeader } from '@clipers/ui';
import ProfileNameForm from '@/components/profile-name-form';
import { getSession } from '@/lib/session';

export default async function BrandSettingsPage() {
  const { user, profile } = await getSession();
  return (
    <Page>
      <PageHeader description="브랜드명은 캠페인과 함께 크리에이터에게 보여요." title="설정" />
      <ProfileNameForm email={user.email ?? ''} initialName={profile.display_name} nameLabel="브랜드명" profileId={profile.id} />
    </Page>
  );
}
