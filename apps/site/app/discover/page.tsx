import Link from 'next/link';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { DiscoverGrid } from './discover-sections';

export const revalidate = 60;

export type CampaignCard = {
  id: string;
  title: string;
  category: string;
  cover_image_url: string | null;
  total_budget: number;
  allowed_platforms: string[];
  brand_name: string;
  rate_range: { min: number; max: number } | null;
};

async function loadCampaignCards(): Promise<CampaignCard[]> {
  const supabase = getSupabaseServerClient();
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('id,title,category,cover_image_url,total_budget,allowed_platforms,brand:profiles!campaigns_brand_id_fkey(display_name)')
    .eq('track', 'self_serve')
    .eq('status', 'live')
    .order('created_at', { ascending: false });

  const rows = (campaigns ?? []) as unknown as Array<{
    id: string;
    title: string;
    category: string;
    cover_image_url: string | null;
    total_budget: number;
    allowed_platforms: string[];
    brand: { display_name: string } | null;
  }>;
  if (rows.length === 0) return [];

  const { data: rates } = await supabase
    .from('campaign_platform_rates')
    .select('campaign_id,cpm_rate')
    .in('campaign_id', rows.map((row) => row.id));
  const rateRows = (rates ?? []) as { campaign_id: string; cpm_rate: number }[];

  return rows.map((row) => {
    const campaignRates = rateRows.filter((rate) => rate.campaign_id === row.id).map((rate) => Number(rate.cpm_rate));
    return {
      id: row.id,
      title: row.title,
      category: row.category,
      cover_image_url: row.cover_image_url,
      total_budget: Number(row.total_budget),
      allowed_platforms: row.allowed_platforms,
      brand_name: row.brand?.display_name ?? '브랜드',
      rate_range: campaignRates.length > 0 ? { min: Math.min(...campaignRates), max: Math.max(...campaignRates) } : null,
    };
  });
}

export type TopClip = {
  id: string;
  url: string;
  campaignTitle: string;
  viewCount: number;
};

async function loadTopClips(campaignIds: string[]): Promise<TopClip[]> {
  if (campaignIds.length === 0) return [];
  const supabase = getSupabaseServerClient();

  const { data: clips } = await supabase
    .from('clips')
    .select('id,url,campaign:campaigns!clips_campaign_id_fkey(title)')
    .eq('status', 'approved')
    .in('campaign_id', campaignIds);
  const clipRows = (clips ?? []) as unknown as { id: string; url: string; campaign: { title: string } | null }[];
  if (clipRows.length === 0) return [];

  const { data: snapshots } = await supabase
    .from('view_snapshots')
    .select('clip_id,view_count,captured_at')
    .in('clip_id', clipRows.map((clip) => clip.id))
    .order('captured_at', { ascending: false });
  const latestByClip = new Map<string, number>();
  for (const row of (snapshots ?? []) as { clip_id: string; view_count: number }[]) {
    if (!latestByClip.has(row.clip_id)) latestByClip.set(row.clip_id, Number(row.view_count));
  }

  return clipRows
    .map((clip) => ({ id: clip.id, url: clip.url, campaignTitle: clip.campaign?.title ?? '캠페인', viewCount: latestByClip.get(clip.id) ?? 0 }))
    .sort((left, right) => right.viewCount - left.viewCount)
    .slice(0, 12);
}

export default async function DiscoverPage() {
  const campaigns = await loadCampaignCards();
  const topClips = await loadTopClips(campaigns.map((campaign) => campaign.id));

  return (
    <main className="app-page">
      <header className="app-global-header">
        <Link className="app-wordmark" href="/">Clipers</Link>
        <nav className="app-global-nav" aria-label="서비스">
          <Link href="/for-creators">크리에이터</Link>
          <Link href="/for-brands">브랜드</Link>
        </nav>
        <a href="https://app.clipers.com/login">로그인</a>
      </header>
      <div className="app-shell">
        <div className="app-heading">
          <p className="app-eyebrow">DISCOVER CAMPAIGNS</p>
          <h1>지금 참여할 수 있는 캠페인</h1>
          <p className="app-muted">예산을 건 캠페인에 클립을 제출하고 검증된 조회수만큼 정산받으세요.</p>
        </div>
        <DiscoverGrid campaigns={campaigns} topClips={topClips} />
      </div>
    </main>
  );
}
