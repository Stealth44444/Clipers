import { notFound } from 'next/navigation';
import { campaignEconomics, campaignPricing, creatorPayoutToClipCap, depositAmount, fetchAllRows, platformLabels } from '@clipers/db';
import { Badge, Card, Page, PageHeader, Stack, SummaryList, formatKRW } from '@clipers/ui';
import { loadCampaignFinances } from '@/lib/campaign-finances';
import { getSession } from '@/lib/session';
import { CAMPAIGN_STATUS, CONTENT_TYPE_LABEL, statusDisplay } from '@/lib/status';
import { ConfirmDepositAction, PricingForm } from '../../review-actions';

export default async function AdminCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getSession();
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, title, status, category, content_type, allowed_platforms, review_sla_hours, brand:profiles!campaigns_brand_id_fkey(display_name)')
    .eq('id', id)
    .maybeSingle();
  if (!campaign) notFound();

  const [finances, settlements, rates] = await Promise.all([
    loadCampaignFinances(supabase, [id]),
    fetchAllRows((from, to) => supabase.from('settlements').select('amount').eq('campaign_id', id).order('id').range(from, to)),
    supabase.from('campaign_platform_rates').select('max_payout').eq('campaign_id', id).limit(1),
  ]);
  const finance = finances.get(id);
  if (!finance) notFound();
  const pricing = campaignPricing(finance);
  const totalBudget = finance.total_budget;
  const creatorPaid = settlements.reduce((sum, row) => sum + Number(row.amount), 0);
  const economics = campaignEconomics(totalBudget, creatorPaid, pricing);
  const clipCap = rates.data?.[0] ? Number(rates.data[0].max_payout) : null;
  const status = statusDisplay(CAMPAIGN_STATUS, campaign.status);
  const brandName = (campaign.brand as unknown as { display_name: string } | null)?.display_name ?? '브랜드';

  return (
    <Page>
      <PageHeader
        actions={
          campaign.status === 'pending_escrow' ? <ConfirmDepositAction amount={depositAmount(totalBudget)} campaignId={campaign.id} reviewerId={user.id} /> : undefined
        }
        description={
          <span className="cl-inline">
            <Badge tone={status.tone}>{status.label}</Badge>
            {brandName} · {campaign.category} · {CONTENT_TYPE_LABEL[campaign.content_type] ?? campaign.content_type}
          </span>
        }
        title={campaign.title}
      />
      <Stack>
        <Card title="예산과 수익">
          <SummaryList
            rows={[
              { label: '총예산', value: formatKRW(totalBudget) },
              { label: '브랜드 사용액', value: formatKRW(economics.spent) },
              { label: '크리에이터 지급액', value: formatKRW(economics.creatorPaid) },
              { label: '플랫폼 수익', value: formatKRW(economics.platformRevenue) },
              {
                label: '클립당 지급 상한',
                value: clipCap ? `크리에이터 ${formatKRW(clipCap)} (브랜드 ${formatKRW(creatorPayoutToClipCap(clipCap, pricing))})` : '—',
              },
            ]}
          />
        </Card>

        <Card description="운영자만 바꿀 수 있어요. 브랜드에게는 브랜드 단가만, 크리에이터에게는 크리에이터 단가만 보여요." title="단가">
          <PricingForm brandCpm={pricing.brandCpm} campaignId={campaign.id} creatorCpm={pricing.creatorCpm} />
        </Card>

        <Card title="설정">
          <SummaryList
            rows={[
              { label: '플랫폼', value: platformLabels(campaign.allowed_platforms) },
              { label: '검수 기간', value: `제출 후 ${campaign.review_sla_hours}시간 이내` },
            ]}
          />
        </Card>
      </Stack>
    </Page>
  );
}
