import { notFound } from 'next/navigation';
import { ExternalLink, Film, Pencil } from 'lucide-react';
import Link from 'next/link';
import { campaignPricing, canTopUp, categoryLabel, classifyDeposit, creatorPayoutToClipCap, depositDue, platformLabel, platformLabels } from '@clipers/db';
import {
  Badge,
  ButtonLink,
  Card,
  DataTable,
  EmptyState,
  Page,
  PageHeader,
  ProgressBar,
  Stack,
  StatCard,
  StatGrid,
  SummaryList,
  formatCompactNumber,
  formatKRW,
} from '@clipers/ui';
import { getBrandCampaigns } from '@/lib/brand-data';
import { loadCampaignFinances } from '@/lib/campaign-finances';
import { getSession } from '@/lib/session';
import { CAMPAIGN_STATUS, CLIP_STATUS, CONTENT_TYPE_LABEL, statusDisplay } from '@/lib/status';
import { getBrandBalance } from '@/lib/brand-balance';
import DepositPanel from './deposit-panel';
import StopCampaignButton from './stop-campaign-button';
import TopUpCard from './topup-card';

type ClipRow = { id: string; url: string; platform: string; status: string; submitted_at: string; creator: { display_name: string } | null };

export default async function BrandCampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getSession();
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, title, status, description, content_requirements, reference_links, review_sla_hours, daily_clip_limit, allowed_platforms, category, content_type')
    .eq('id', id)
    .eq('brand_id', user.id)
    .maybeSingle();
  if (!campaign) notFound();

  const [summary, rates, clips] = await Promise.all([
    getBrandCampaigns().then((campaigns) => campaigns.find((row) => row.id === id)!),
    supabase.from('campaign_platform_rates').select('max_payout').eq('campaign_id', id).limit(1),
    supabase
      .from('clips')
      .select('id, url, platform, status, submitted_at, creator:profiles!clips_creator_id_fkey(display_name)')
      .eq('campaign_id', id)
      .order('submitted_at', { ascending: false }),
  ]);

  const [finances, { data: billing }, { data: escrow }, { data: overDeposits }, { data: pendingTopUp }, balance] = await Promise.all([
    loadCampaignFinances(supabase, [id]),
    supabase.from('brand_billing_profiles').select('company_name').eq('brand_id', user.id).maybeSingle(),
    supabase.from('campaign_escrow').select('received_amount, credit_applied').eq('campaign_id', id).maybeSingle(),
    supabase.from('brand_refunds').select('id, transfer_amount, status').eq('campaign_id', id).eq('kind', 'over_deposit').order('requested_at'),
    supabase.from('campaign_topups').select('amount, credit_applied, received_amount').eq('campaign_id', id).eq('status', 'pending').maybeSingle(),
    getBrandBalance(),
  ]);
  const finance = finances.get(id);
  if (!finance) notFound();
  const pricing = campaignPricing(finance);
  const clipCap = rates.data?.[0] ? creatorPayoutToClipCap(Number(rates.data[0].max_payout), pricing) : null;
  const status = statusDisplay(CAMPAIGN_STATUS, campaign.status);
  const clipRows = (clips.data ?? []) as unknown as ClipRow[];
  const bankTransferInfo = process.env.NEXT_PUBLIC_BANK_TRANSFER_INFO;
  const received = Number(escrow?.received_amount ?? 0);
  const deposit = escrow ? classifyDeposit(depositDue(summary.total_budget, Number(escrow.credit_applied)), received) : null;
  const leftover = balance.rows.find((row) => row.kind === 'leftover' && row.campaign_id === id);

  return (
    <Page>
      <PageHeader
        actions={
          campaign.status === 'draft' ? (
            <ButtonLink href={`/brand/campaigns/new?draft=${campaign.id}`} icon={<Pencil size={15} />} variant="secondary">
              수정
            </ButtonLink>
          ) : campaign.status === 'live' ? (
            <StopCampaignButton campaignId={campaign.id} />
          ) : undefined
        }
        description={
          <span className="cl-inline">
            <Badge tone={status.tone}>{status.label}</Badge>
            {categoryLabel(campaign.category)} · {CONTENT_TYPE_LABEL[campaign.content_type] ?? campaign.content_type}
          </span>
        }
        title={campaign.title}
      />
      <Stack>
        {campaign.status === 'draft' && (
          <Card description="입금을 마치고 아래 버튼을 누르면 운영팀이 확인한 뒤 캠페인을 공개하고, 입금한 금액만큼 세금계산서를 발행해요." title="예산 입금">
            <DepositPanel
              balance={balance.summary.balance}
              bankTransferInfo={bankTransferInfo ?? null}
              billingReady={Boolean(billing)}
              campaignId={campaign.id}
              serviceAmount={summary.total_budget}
            />
          </Card>
        )}
        {campaign.status === 'pending_escrow' && (
          <p className="cl-alert cl-tone-amber" role="status">
            {deposit?.kind === 'short' && received > 0
              ? `${formatKRW(received)}이 확인됐어요. 차액 ${formatKRW(deposit.difference)}을 더 입금해 주세요.`
              : '운영팀이 입금을 확인하고 있어요. 확인되면 캠페인이 공개되고 크리에이터 지원을 받기 시작해요.'}
          </p>
        )}
        {(overDeposits ?? []).map((refund) => (
          <p className="cl-alert cl-tone-sky" key={refund.id} role="status">
            {refund.status === 'paid'
              ? `초과 입금한 ${formatKRW(refund.transfer_amount)}을 입금한 계좌로 돌려드렸어요.`
              : `초과 입금한 ${formatKRW(refund.transfer_amount)}은 영업일 7일 안에 입금한 계좌로 돌려드려요.`}
          </p>
        ))}
        {campaign.status === 'closed' && summary.stoppedAt && !summary.finalizedAt && (
          <p className="cl-alert cl-tone-sky" role="status">
            중단한 캠페인이에요. 이번 주 조회수까지 정산한 뒤 다음 월요일에 남은 금액이 확정돼요.
          </p>
        )}
        {leftover && (
          <p className="cl-alert cl-tone-brand" role="status">
            남은 {formatKRW(leftover.amount)}을 잔액으로 옮겼어요. 반환을 요청하거나 다음 캠페인에 쓸 수 있어요.{' '}
            <Link className="cl-link" href="/brand/spend">
              예산 사용 내역
            </Link>
          </p>
        )}

        <StatGrid>
          <StatCard highlight label="사용한 예산" value={formatKRW(summary.spent)} />
          <StatCard label="최대 조회수" value={formatCompactNumber(summary.expectedViews)} />
          <StatCard label="검증 조회수" value={formatCompactNumber(summary.verifiedViews)} />
          <StatCard label="받은 클립" value={summary.clipCount} />
        </StatGrid>

        <Card title="예산">
          <div className="cl-stack-tight">
            <ProgressBar label="예산 사용률" value={summary.usageRatio} />
            <SummaryList
              rows={[
                { label: '총예산', value: formatKRW(summary.total_budget) },
                { label: '남은 예산', value: formatKRW(summary.remaining) },
                { label: '과금 기준', value: `검증 조회수 1천 회당 ${formatKRW(pricing.brandCpm)}` },
                { label: '클립당 최대 예산', value: clipCap ? formatKRW(clipCap) : '—' },
              ]}
            />
          </div>
        </Card>

        {canTopUp(campaign.status, summary.stoppedAt) && (
          <TopUpCard
            balance={balance.summary.balance}
            bankTransferInfo={bankTransferInfo ?? null}
            billingReady={Boolean(billing)}
            campaignId={campaign.id}
            pending={
              pendingTopUp
                ? { amount: pendingTopUp.amount, credit: pendingTopUp.credit_applied, received: pendingTopUp.received_amount }
                : null
            }
            reopens={campaign.status === 'closed'}
          />
        )}

        <Card title="브리프">
          <SummaryList
            rows={[
              { label: '플랫폼', value: platformLabels(campaign.allowed_platforms) },
              { label: '검수 기간', value: `제출 후 ${campaign.review_sla_hours}시간 이내` },
              { label: '하루 제출 한도', value: campaign.daily_clip_limit === null ? '제한 없음' : `크리에이터 1명당 하루 ${campaign.daily_clip_limit}개` },
              { label: '설명', value: campaign.description || '—' },
              { label: '요구사항', value: campaign.content_requirements || '—' },
              {
                label: '참고 링크',
                value:
                  campaign.reference_links.length > 0 ? (
                    <span className="cl-inline">
                      {campaign.reference_links.map((link: string, index: number) => (
                        <a className="cl-link" href={link} key={link} rel="noreferrer" target="_blank">
                          링크 {index + 1}
                        </a>
                      ))}
                    </span>
                  ) : (
                    '—'
                  ),
              },
            ]}
          />
        </Card>

        <section>
          <h2 className="cl-section-header__title cl-section-gap">받은 클립</h2>
          {clipRows.length > 0 ? (
            <DataTable
              columns={[
                { key: 'creator', header: '크리에이터', render: (clip) => clip.creator?.display_name ?? '크리에이터' },
                { key: 'platform', header: '플랫폼', render: (clip) => platformLabel(clip.platform) },
                {
                  key: 'submitted',
                  header: '제출일',
                  render: (clip) => new Date(clip.submitted_at).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' }),
                },
                {
                  key: 'status',
                  header: '검수',
                  render: (clip) => {
                    const clipStatus = statusDisplay(CLIP_STATUS, clip.status);
                    return <Badge tone={clipStatus.tone}>{clipStatus.label}</Badge>;
                  },
                },
                {
                  key: 'link',
                  header: '',
                  align: 'right',
                  render: (clip) => (
                    <a aria-label="영상 열기" className="cl-icon-button" href={clip.url} rel="noreferrer" target="_blank">
                      <ExternalLink size={16} />
                    </a>
                  ),
                },
              ]}
              empty=""
              label="받은 클립"
              rowKey={(clip) => clip.id}
              rows={clipRows}
            />
          ) : (
            <Card>
              <EmptyState
                description={
                  campaign.status === 'live'
                    ? '크리에이터들이 지원하고 승인되면 영상이 올라오기 시작해요.'
                    : '캠페인이 공개되면 크리에이터들의 영상이 여기에 모여요.'
                }
                icon={<Film size={24} />}
                title="아직 받은 클립이 없어요"
              />
            </Card>
          )}
        </section>
      </Stack>
    </Page>
  );
}
