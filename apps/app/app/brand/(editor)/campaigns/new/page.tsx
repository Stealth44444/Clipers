import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DEFAULT_PRICING, campaignPricing, categoryId, creatorPayoutToClipCap, emptyCampaignDraft, type CampaignDraft } from '@clipers/db';
import { loadCampaignFinances } from '@/lib/campaign-finances';
import { getSession } from '@/lib/session';
import CampaignForm from './campaign-form';

export const metadata: Metadata = { title: '캠페인 만들기 · Clipers' };

export default async function NewCampaignPage({ searchParams }: { searchParams: Promise<{ draft?: string }> }) {
  const { draft: draftId } = await searchParams;
  const { supabase, user } = await getSession();

  if (!draftId) {
    return <CampaignForm brandId={user.id} initial={emptyCampaignDraft()} pricing={DEFAULT_PRICING} />;
  }

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, title, description, content_type, category, allowed_platforms, review_sla_hours, daily_clip_limit, reference_links, content_requirements, cover_image_url')
    .eq('id', draftId)
    .eq('brand_id', user.id)
    .eq('status', 'draft')
    .maybeSingle();
  if (!campaign) notFound();

  const finance = (await loadCampaignFinances(supabase, [draftId])).get(draftId);
  if (!finance) notFound();
  const pricing = campaignPricing(finance);
  const { data: rates } = await supabase.from('campaign_platform_rates').select('max_payout').eq('campaign_id', draftId).limit(1);
  const initial: CampaignDraft = {
    title: campaign.title,
    description: campaign.description ?? '',
    contentType: campaign.content_type,
    category: categoryId(campaign.category) ?? '',
    platforms: campaign.allowed_platforms,
    totalBudget: String(finance.total_budget),
    maxPayoutPerClip: rates?.[0] ? String(creatorPayoutToClipCap(Number(rates[0].max_payout), pricing)) : '',
    reviewSlaHours: String(campaign.review_sla_hours),
    dailyClipLimit: campaign.daily_clip_limit === null ? 'none' : String(campaign.daily_clip_limit),
    referenceLinks: campaign.reference_links.length > 0 ? campaign.reference_links : [''],
    requirements: campaign.content_requirements ?? '',
  };

  return (
    <CampaignForm
      brandId={user.id}
      campaignId={campaign.id}
      initial={initial}
      initialCoverUrl={campaign.cover_image_url}
      pricing={pricing}
    />
  );
}
