'use server';

import { redirect } from 'next/navigation';
import { campaignDraftErrors, CAMPAIGN_DRAFT_FIELDS, clipCapToCreatorPayout, dailyClipLimitValue, filledReferenceLinks, validateManagedPricing, type CampaignDraft } from '@clipers/db';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export type ManagedCampaignState = { message: string } | null;

/**
 * An operator sets up a brand's campaign on contract terms. It starts waiting for the deposit, which the operator
 * confirms on the deposits page like any other; from then on it runs exactly like a self-serve campaign.
 */
export async function createManagedCampaign(_previous: ManagedCampaignState, form: FormData): Promise<ManagedCampaignState> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { message: '다시 로그인해 주세요.' };
  const { data: operator } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (operator?.role !== 'admin') return { message: '운영자만 만들 수 있어요.' };

  const text = (name: string) => String(form.get(name) ?? '');
  const draft: CampaignDraft = {
    title: text('title'),
    description: text('description'),
    contentType: text('contentType') === 'ugc' ? 'ugc' : 'clipping',
    category: text('category'),
    platforms: form.getAll('platforms').map(String),
    totalBudget: text('totalBudget'),
    maxPayoutPerClip: text('maxPayoutPerClip'),
    reviewSlaHours: text('reviewSlaHours') || '48',
    dailyClipLimit: text('dailyClipLimit') || 'none',
    referenceLinks: text('referenceLinks').split(/\s+/),
    requirements: text('requirements'),
  };
  const errors = campaignDraftErrors(draft);
  const field = CAMPAIGN_DRAFT_FIELDS.find((key) => errors[key]);
  if (field) return { message: errors[field]! };
  const pricing = validateManagedPricing(Number(text('brandCpm')), Number(text('creatorCpm')));
  if (!pricing.ok) return { message: pricing.message };

  const admin = getSupabaseAdminClient();
  const brandId = text('brandId');
  const { data: brand } = await admin.from('profiles').select('id').eq('id', brandId).eq('role', 'brand').maybeSingle();
  if (!brand) return { message: '브랜드 계정을 골라 주세요.' };

  // Service key: the pricing guard lets it set contract rates, and the campaign goes straight to awaiting deposit.
  const { data: campaign, error } = await admin
    .from('campaigns')
    .insert({
      brand_id: brandId,
      track: 'self_serve',
      status: 'pending_escrow',
      managed_by: user.id,
      title: draft.title.trim(),
      description: draft.description.trim() || null,
      content_type: draft.contentType,
      category: draft.category,
      allowed_platforms: draft.platforms,
      total_budget: Number(draft.totalBudget),
      review_sla_hours: Number(draft.reviewSlaHours),
      daily_clip_limit: dailyClipLimitValue(draft),
      reference_links: filledReferenceLinks(draft.referenceLinks),
      content_requirements: draft.requirements.trim() || null,
      brand_cpm: pricing.pricing.brandCpm,
      creator_cpm: pricing.pricing.creatorCpm,
    })
    .select('id')
    .single();
  if (error || !campaign) return { message: '캠페인을 만들지 못했어요. 잠시 후 다시 시도해 주세요.' };

  const maxPayout = clipCapToCreatorPayout(Number(draft.maxPayoutPerClip), pricing.pricing);
  const { error: ratesError } = await admin
    .from('campaign_platform_rates')
    .insert(draft.platforms.map((platform) => ({ campaign_id: campaign.id, platform, cpm_rate: pricing.pricing.creatorCpm, max_payout: maxPayout })));
  if (ratesError) {
    await admin.from('campaigns').delete().eq('id', campaign.id);
    return { message: '플랫폼별 단가를 저장하지 못했어요. 다시 시도해 주세요.' };
  }
  redirect(`/admin/campaigns/${campaign.id}`);
}
