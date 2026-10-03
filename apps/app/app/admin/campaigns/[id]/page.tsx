import { notFound } from 'next/navigation';
import { campaignEconomics, campaignPricing, categoryLabel, creatorPayoutToClipCap, depositDue, fetchAllRows, platformLabel, platformLabels, UNAVAILABLE_REASON_LABEL } from '@clipers/db';
import { Badge, Card, DataTable, Page, PageHeader, Stack, SummaryList, formatKRW } from '@clipers/ui';
import { loadCampaignFinances } from '@/lib/campaign-finances';
import { getSession } from '@/lib/session';
import { CAMPAIGN_STATUS, CONTENT_TYPE_LABEL, statusDisplay } from '@/lib/status';
import { ClipAvailabilityAction, ConfirmDepositAction, PricingForm } from '../../review-actions';

type ApprovedClip = {
  id: string;
  url: string;
  platform: string;
  unavailable_at: string | null;
  unavailable_reason: 'missing' | 'unlisted' | 'manual' | null;
  creator: { display_name: string } | null;
};

const shortDate = (value: string) => new Date(value).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });

export default async function AdminCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await getSession();
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, title, status, category, content_type, allowed_platforms, review_sla_hours, managed_by, brand:profiles!campaigns_brand_id_fkey(display_name)')
    .eq('id', id)
    .maybeSingle();
  if (!campaign) notFound();

  const [finances, settlements, rates, { data: escrow }, approvedClips] = await Promise.all([
    loadCampaignFinances(supabase, [id]),
    fetchAllRows((from, to) => supabase.from('settlements').select('amount').eq('campaign_id', id).order('id').range(from, to)),
    supabase.from('campaign_platform_rates').select('max_payout').eq('campaign_id', id).limit(1),
    supabase.from('campaign_escrow').select('credit_applied, received_amount').eq('campaign_id', id).maybeSingle(),
    fetchAllRows((from, to) =>
      supabase
        .from('clips')
        .select('id, url, platform, unavailable_at, unavailable_reason, creator:profiles!clips_creator_id_fkey(display_name)')
        .eq('campaign_id', id)
        .eq('status', 'approved')
        .order('reviewed_at', { ascending: false })
        .range(from, to)
    ).then((rows) => rows as unknown as ApprovedClip[]),
  ]);
  const finance = finances.get(id);
  if (!finance) notFound();
  const pricing = campaignPricing(finance);
  const totalBudget = finance.total_budget;
  const creatorPaid = settlements.reduce((sum, row) => sum + Number(row.amount), 0);
  const economics = campaignEconomics(totalBudget, creatorPaid, pricing);
  const clipCap = rates.data?.[0] ? Number(rates.data[0].max_payout) : null;
  const status = statusDisplay(CAMPAIGN_STATUS, campaign.status);
  const depositRemaining = Math.max(0, depositDue(totalBudget, Number(escrow?.credit_applied ?? 0)) - Number(escrow?.received_amount ?? 0));
  const brandName = (campaign.brand as unknown as { display_name: string } | null)?.display_name ?? '브랜드';

  return (
    <Page>
      <PageHeader
        actions={
          campaign.status === 'pending_escrow' ? <ConfirmDepositAction amount={depositRemaining} target={{ campaignId: campaign.id }} /> : undefined
        }
        description={
          <span className="cl-inline">
            <Badge tone={status.tone}>{status.label}</Badge>
            {campaign.managed_by && <Badge tone="violet">매니지드</Badge>}
            {brandName} · {categoryLabel(campaign.category)} · {CONTENT_TYPE_LABEL[campaign.content_type] ?? campaign.content_type}
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

        <Card description="삭제·비공개를 직접 확인한 클립은 표시해 주세요. 표시한 날이 속한 주부터 정산에서 빠져요. 유튜브는 매일 자동으로 확인해요." title="승인된 클립">
          {approvedClips.length > 0 ? (
            <DataTable
              columns={[
                {
                  key: 'creator',
                  header: '크리에이터',
                  render: (clip) => (
                    <div>
                      <p>{clip.creator?.display_name ?? '크리에이터'}</p>
                      <p className="cl-meta-subtle">{platformLabel(clip.platform)}</p>
                    </div>
                  ),
                },
                {
                  key: 'state',
                  header: '정산',
                  render: (clip) =>
                    clip.unavailable_at && clip.unavailable_reason ? (
                      <Badge tone="amber">
                        멈춤 · {UNAVAILABLE_REASON_LABEL[clip.unavailable_reason]} · {shortDate(clip.unavailable_at)}
                      </Badge>
                    ) : (
                      <Badge tone="brand">진행 중</Badge>
                    ),
                },
                {
                  key: 'link',
                  header: '',
                  render: (clip) => (
                    <a className="cl-link" href={clip.url} rel="noreferrer" target="_blank">
                      영상 열기
                    </a>
                  ),
                },
                {
                  key: 'actions',
                  header: '',
                  align: 'right',
                  render: (clip) => <ClipAvailabilityAction clipId={clip.id} unavailable={!!clip.unavailable_at} />,
                },
              ]}
              empty=""
              label="승인된 클립"
              rowKey={(clip) => clip.id}
              rows={approvedClips}
            />
          ) : (
            <p className="cl-meta">아직 승인된 클립이 없어요.</p>
          )}
        </Card>
      </Stack>
    </Page>
  );
}
