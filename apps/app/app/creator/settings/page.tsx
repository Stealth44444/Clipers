import { Page, PageHeader } from '@clipers/ui';
import { getSession } from '@/lib/session';
import SettingsForm from './settings-form';

export default async function CreatorSettingsPage() {
  const { user, profile } = await getSession();
  return (
    <Page>
      <PageHeader description="프로필과 관심 분야를 바꾸면 추천 캠페인에 반영돼요." title="설정" />
      <SettingsForm email={user.email ?? ''} profile={profile} />
    </Page>
  );
}
