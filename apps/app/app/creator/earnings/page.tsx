import { Banknote, CalendarDays, Clock, Wallet } from 'lucide-react';
import { settlementPeriodLabel, summarizeEarnings } from '@clipers/db';
import {
  Badge,
  Card,
  DataTable,
  EmptyState,
  Page,
  PageHeader,
  SectionHeader,
  Stack,
  StatCard,
  StatGrid,
  Timeline,
  formatKRW,
} from '@clipers/ui';
import { getSession } from '@/lib/session';
import { SETTLEMENT_STATUS, statusDisplay } from '@/lib/status';
import RequestPayoutButton from './request-payout-button';

type Settlement = {
  id: string;
  period: string;
  amount: number | string;
  withholding_amount: number | string;
  verified_views: number;
  status: string;
  campaign: { title: string } | null;
};

const ICON = { size: 18 };

export default async function CreatorEarningsPage() {
  const { supabase, user } = await getSession();
  const { data } = await supabase
    .from('settlements')
    .select('id, period, amount, withholding_amount, verified_views, status, campaign:campaigns!settlements_campaign_id_fkey(title)')
    .eq('creator_id', user.id)
    .order('period', { ascending: false });
  const settlements = (data ?? []) as unknown as Settlement[];
  const summary = summarizeEarnings(settlements);

  return (
    <Page>
      <PageHeader description="검수를 통과한 클립은 조회수 1,000회부터 매주 정산돼요. 금액은 원천징수 전 기준이에요." title="수익" />
      <Stack>
        <StatGrid>
          <StatCard highlight icon={<Wallet {...ICON} />} label="받을 금액" tone="brand" value={formatKRW(summary.unpaid)} />
          <StatCard icon={<Clock {...ICON} />} label="지난주 정산액" tone="sky" value={formatKRW(summary.lastWeek)} />
          <StatCard icon={<CalendarDays {...ICON} />} label="이번 달 정산액" tone="violet" value={formatKRW(summary.thisMonth)} />
          <StatCard icon={<Banknote {...ICON} />} label="누적 정산액" tone="amber" value={formatKRW(summary.total)} />
        </StatGrid>

        <Card description="정산 대기 건은 지급 요청을 보내면 운영팀이 확인 후 지급해요." title="지급 단계">
          <Timeline
            items={(['pending', 'requested', 'paid'] as const).map((status) => ({
              id: status,
              label: SETTLEMENT_STATUS[status].label,
              count: summary.byStatus[status].count,
              valueLabel: '합계',
              value: formatKRW(summary.byStatus[status].amount),
            }))}
          />
        </Card>

        <section>
          <SectionHeader title="정산 내역" />
          {settlements.length > 0 ? (
            <DataTable
              columns={[
                {
                  key: 'period',
                  header: '정산 주',
                  render: (row) => (
                    <div>
                      <p>{settlementPeriodLabel(row.period)}</p>
                      <p className="cl-meta-subtle">{row.campaign?.title ?? '캠페인'}</p>
                    </div>
                  ),
                },
                { key: 'views', header: '검증 조회수', align: 'right', render: (row) => Number(row.verified_views).toLocaleString('ko-KR') },
                { key: 'amount', header: '정산액', align: 'right', render: (row) => formatKRW(Number(row.amount)) },
                { key: 'withholding', header: '원천징수', align: 'right', render: (row) => formatKRW(Number(row.withholding_amount)) },
                {
                  key: 'net',
                  header: '실지급액',
                  align: 'right',
                  render: (row) => <span className="cl-emphasis">{formatKRW(Number(row.amount) - Number(row.withholding_amount))}</span>,
                },
                {
                  key: 'status',
                  header: '상태',
                  render: (row) => {
                    const status = statusDisplay(SETTLEMENT_STATUS, row.status);
                    return row.status === 'pending' ? (
                      <RequestPayoutButton settlementId={row.id} />
                    ) : (
                      <Badge tone={status.tone}>{status.label}</Badge>
                    );
                  },
                },
              ]}
              empty=""
              label="정산 내역"
              rowKey={(row) => row.id}
              rows={settlements}
            />
          ) : (
            <Card>
              <EmptyState
                description="승인된 클립의 조회수가 쌓이면 다음 정산부터 여기에 표시돼요."
                icon={<Wallet size={24} />}
                title="아직 정산 내역이 없어요"
                tone="neutral"
              />
            </Card>
          )}
        </section>
      </Stack>
    </Page>
  );
}
