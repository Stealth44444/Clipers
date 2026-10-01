import { Page, PageHeader } from '@clipers/ui';
import ViewsAnalytics from '@/components/views-analytics';
import { getBrandCampaigns } from '@/lib/brand-data';
import { getSession } from '@/lib/session';
import { loadSnapshotsByClip } from '@/lib/snapshots';

export default async function BrandAnalyticsPage() {
  const { supabase } = await getSession();
  const campaigns = await getBrandCampaigns();
  const { data } = campaigns.length
    ? await supabase.from('clips').select('id, campaign_id, status').in('campaign_id', campaigns.map((campaign) => campaign.id))
    : { data: [] };
  const clips = data ?? [];
  const snapshots = await loadSnapshotsByClip(supabase, clips.map((clip) => clip.id));

  return (
    <Page>
      <PageHeader description="모든 캠페인의 조회수 흐름을 확인하세요. 날짜는 한국 시간 기준이에요." title="분석" />
      <ViewsAnalytics
        clipLabel="받은 클립"
        clips={clips.map((clip) => ({ id: clip.id, group: clip.campaign_id, status: clip.status, snapshots: snapshots.get(clip.id) ?? [] }))}
        filter={{
          label: '캠페인',
          allLabel: '모든 캠페인',
          options: campaigns.map((campaign) => ({ value: campaign.id, label: campaign.title })),
        }}
      />
    </Page>
  );
}
