import { Megaphone, Plus } from 'lucide-react';
import { ButtonLink, Card, EmptyState, Page, PageHeader } from '@clipers/ui';
import { getBrandCampaigns } from '@/lib/brand-data';
import CampaignTable from '../campaign-table';

export default async function BrandCampaignsPage() {
  const campaigns = await getBrandCampaigns();
  return (
    <Page>
      <PageHeader
        actions={<ButtonLink href="/brand/campaigns/new" icon={<Plus size={16} />} variant="primary">캠페인 만들기</ButtonLink>}
        description="캠페인별 예산 사용과 받은 클립을 확인하세요."
        title="캠페인"
      />
      {campaigns.length > 0 ? (
        <CampaignTable campaigns={campaigns} />
      ) : (
        <Card>
          <EmptyState
            action={<ButtonLink href="/brand/campaigns/new" variant="primary">캠페인 만들기</ButtonLink>}
            description="첫 캠페인을 만들면 이곳에서 진행 상황을 확인할 수 있어요."
            icon={<Megaphone size={24} />}
            title="아직 캠페인이 없어요"
          />
        </Card>
      )}
    </Page>
  );
}
