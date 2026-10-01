import { notFound } from 'next/navigation';
import CampaignDetail from '@/components/campaign-detail';
import CampaignSheet from '@/components/campaign-sheet';
import { loadCampaignDetail } from '@/lib/campaigns';

export default async function CampaignSheetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const campaign = await loadCampaignDetail(id);
  if (!campaign) notFound();
  return (
    <CampaignSheet campaignId={id}>
      <CampaignDetail campaign={campaign} />
    </CampaignSheet>
  );
}
