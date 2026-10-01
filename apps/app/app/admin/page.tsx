import Link from 'next/link';
import { ClipboardCheck, Landmark, MessageSquareWarning, UserCheck } from 'lucide-react';
import { campaignEconomics, campaignPricing, fetchAllRows, fetchAllRowsIn, getViewSpikeFlags } from '@clipers/db';
import { Badge, DataTable, Page, PageHeader, ProgressBar, SectionHeader, Stack, StatCard, StatGrid, formatKRW } from '@clipers/ui';
import { getAdminQueueCounts } from '@/lib/admin-data';
import { getSession } from '@/lib/session';
import { loadSnapshotsByClip } from '@/lib/snapshots';
import { CAMPAIGN_STATUS, statusDisplay } from '@/lib/status';

type CampaignRow = {
  id: string;
  title: string;
  status: string;
  total_budget: number;
  brand_cpm: number;
  creator_cpm: number;
  brand: { display_name: string } | null;
};
type FlaggedClip = { id: string; url: string; campaign: { title: string } | null; creator: { display_name: string } | null };

const ICON = { size: 18 };

export default async function AdminOverviewPage() {
  const { supabase } = await getSession();
  const counts = await getAdminQueueCounts();
  const [campaignResult, approvedClipResult] = await Promise.all([
    supabase
      .from('campaigns')
      .select('id, title, status, total_budget, brand_cpm, creator_cpm, brand:profiles!campaigns_brand_id_fkey(display_name)')
      .in('status', ['pending_escrow', 'live', 'paused', 'closed'])
      .order('created_at', { ascending: false }),
    fetchAllRows((from, to) =>
      supabase
        .from('clips')
        .select('id, url, campaign:campaigns!clips_campaign_id_fkey(title), creator:profiles!clips_creator_id_fkey(display_name)')
        .eq('status', 'approved')
        .order('id')
        .range(from, to)
    ),
  ]);
  const campaigns = (campaignResult.data ?? []) as unknown as CampaignRow[];

  const settlementRows = await fetchAllRowsIn(campaigns.map((campaign) => campaign.id), (ids) => (from, to) =>
    supabase.from('settlements').select('campaign_id, amount').in('campaign_id', ids).order('id').range(from, to)
  );
  const paidByCampaign = new Map<string, number>();
  for (const row of settlementRows) paidByCampaign.set(row.campaign_id, (paidByCampaign.get(row.campaign_id) ?? 0) + Number(row.amount));

  const rows = campaigns.map((campaign) => {
    const totalBudget = Number(campaign.total_budget);
    const economics = campaignEconomics(totalBudget, paidByCampaign.get(campaign.id) ?? 0, campaignPricing(campaign));
    return { ...campaign, totalBudget, ...economics, ratio: totalBudget > 0 ? economics.spent / totalBudget : 0 };
  });
  const revenue = rows.reduce((sum, row) => sum + row.platformRevenue, 0);

  // Spike flags look at the last 48 hours of snapshots for approved clips.
  const approvedClips = approvedClipResult as unknown as FlaggedClip[];
  const snapshots = await loadSnapshotsByClip(supabase, approvedClips.map((clip) => clip.id));
  const since = Date.now() - 48 * 60 * 60 * 1000;
  const flags = getViewSpikeFlags(
    [...snapshots.entries()].map(([clipId, points]) => ({ clipId, snapshots: points.filter((point) => Date.parse(point.capturedAt) >= since) }))
  );
  const clipById = new Map(approvedClips.map((clip) => [clip.id, clip]));

  return (
    <Page>
      <PageHeader description="처리할 일과 캠페인별 예산·수익 흐름을 확인하세요." title="현황" />
      <Stack>
        {(counts.overdueClips > 0 || flags.length > 0) && (
          <div className="cl-stack-tight">
            {counts.overdueClips > 0 && (
              <p className="cl-alert cl-tone-tomato" role="alert">
                검수 기한을 넘긴 클립이 {counts.overdueClips}건 있어요. <Link className="cl-link" href="/admin/clips">클립 검수로 이동</Link>
              </p>
            )}
            {flags.length > 0 && (
              <p className="cl-alert cl-tone-amber" role="status">
                최근 48시간 동안 조회수가 급증한 승인 클립이 {flags.length}건 있어요. 아래 목록을 확인해 주세요.
              </p>
            )}
          </div>
        )}

        <StatGrid>
          <StatCard icon={<Landmark {...ICON} />} label="입금 확인 대기" tone="amber" value={counts.deposits} />
          <StatCard icon={<UserCheck {...ICON} />} label="검토할 지원서" tone="sky" value={counts.applications} />
          <StatCard icon={<ClipboardCheck {...ICON} />} label="검수할 클립" tone="violet" value={counts.clips} />
          <StatCard icon={<MessageSquareWarning {...ICON} />} label="조회수 신고·이의제기" tone="tomato" value={counts.viewReports + counts.disputes} />
        </StatGrid>

        <section>
          <SectionHeader description={`플랫폼 수익 누적 ${formatKRW(revenue)} (브랜드 사용액 − 크리에이터 지급액)`} title="캠페인" />
          <DataTable
            columns={[
              {
                key: 'title',
                header: '캠페인',
                render: (row) => (
                  <div>
                    <Link className="cl-table-link" href={`/admin/campaigns/${row.id}`}>
                      {row.title}
                    </Link>
                    <p className="cl-meta-subtle">{row.brand?.display_name ?? '브랜드'}</p>
                  </div>
                ),
              },
              {
                key: 'status',
                header: '상태',
                render: (row) => {
                  const status = statusDisplay(CAMPAIGN_STATUS, row.status);
                  return <Badge tone={status.tone}>{status.label}</Badge>;
                },
              },
              {
                key: 'usage',
                header: '예산 사용',
                render: (row) => (
                  <div className="cl-budget-cell">
                    <ProgressBar label={`${row.title} 예산 사용률`} value={row.ratio} />
                    <p className="cl-meta-subtle cl-number">
                      {formatKRW(row.spent)} / {formatKRW(row.totalBudget)}
                    </p>
                  </div>
                ),
              },
              { key: 'paid', header: '크리에이터 지급', align: 'right', render: (row) => formatKRW(row.creatorPaid) },
              { key: 'revenue', header: '플랫폼 수익', align: 'right', render: (row) => <span className="cl-emphasis">{formatKRW(row.platformRevenue)}</span> },
            ]}
            empty="입금 확인 이후 단계의 캠페인이 없어요."
            label="캠페인 현황"
            rowKey={(row) => row.id}
            rows={rows}
          />
        </section>

        {flags.length > 0 && (
          <section>
            <SectionHeader
              description="1시간 안에 3배 이상 또는 5만 회 이상 늘어난 클립이에요. 기준은 잠정치이며, 정산 보류 여부는 사람이 판단해요."
              title="이상 트래픽"
            />
            <DataTable
              columns={[
                {
                  key: 'clip',
                  header: '캠페인 / 크리에이터',
                  render: (flag) => {
                    const clip = clipById.get(flag.clipId);
                    return (
                      <div>
                        <p>{clip?.campaign?.title ?? '캠페인'}</p>
                        <p className="cl-meta-subtle">{clip?.creator?.display_name ?? '크리에이터'}</p>
                      </div>
                    );
                  },
                },
                {
                  key: 'change',
                  header: '조회수 변화',
                  align: 'right',
                  render: (flag) => `${flag.previousViewCount.toLocaleString('ko-KR')} → ${flag.currentViewCount.toLocaleString('ko-KR')}`,
                },
                {
                  key: 'link',
                  header: '',
                  align: 'right',
                  render: (flag) => {
                    const clip = clipById.get(flag.clipId);
                    return clip ? (
                      <a className="cl-link" href={clip.url} rel="noreferrer" target="_blank">
                        영상 열기
                      </a>
                    ) : null;
                  },
                },
              ]}
              empty=""
              label="이상 트래픽 클립"
              rowKey={(flag) => flag.clipId}
              rows={flags}
            />
          </section>
        )}
      </Stack>
    </Page>
  );
}
