import { Wallet } from 'lucide-react';
import { bankName, fetchAllRows, maskAccountNumber, payoutRequest, settlementPeriodLabel, summarizeEarnings } from '@clipers/db';
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
  verified_views: number;
  status: string;
  campaign: { title: string } | null;
};

type Payout = {
  id: string;
  gross_amount: number;
  income_tax: number;
  local_tax: number;
  net_amount: number;
  bank_code: string;
  account_number: string;
  status: 'requested' | 'paid';
  requested_at: string;
  paid_at: string | null;
};

const formatDate = (iso: string) => new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: 'long', day: 'numeric' }).format(new Date(iso));

export default async function CreatorEarningsPage() {
  const { supabase, user } = await getSession();
  const settlements = (await fetchAllRows((from, to) =>
    supabase
      .from('settlements')
      .select('id, period, amount, verified_views, status, campaign:campaigns!settlements_campaign_id_fkey(title)')
      .eq('creator_id', user.id)
      .order('period', { ascending: false })
      .order('id')
      .range(from, to)
  )) as unknown as Settlement[];
  const [{ data: payoutRows }, { data: account }] = await Promise.all([
    supabase
      .from('payouts')
      .select('id, gross_amount, income_tax, local_tax, net_amount, bank_code, account_number, status, requested_at, paid_at')
      .eq('creator_id', user.id)
      .order('requested_at', { ascending: false }),
    supabase.from('payout_accounts').select('bank_code, account_number').eq('creator_id', user.id).maybeSingle(),
  ]);
  const payouts = (payoutRows ?? []) as Payout[];
  const summary = summarizeEarnings(settlements);
  const payout = payoutRequest(settlements);

  return (
    <Page>
      <PageHeader description="검수를 통과한 클립은 조회수 1,000회부터 매주 정산돼요. 정산액은 세금을 떼기 전 금액이에요." title="수익" />
      <Stack>
        <StatGrid>
          <StatCard highlight label="받을 금액" value={formatKRW(summary.unpaid)} />
          <StatCard label="지난주 정산액" value={formatKRW(summary.lastWeek)} />
          <StatCard label="이번 달 정산액" value={formatKRW(summary.thisMonth)} />
          <StatCard label="누적 정산액" value={formatKRW(summary.total)} />
        </StatGrid>

        <Card>
          <RequestPayoutButton
            account={account ? `${bankName(account.bank_code)} ${maskAccountNumber(account.account_number)}` : null}
            canRequest={payout.canRequest}
            shortfall={payout.shortfall}
            tax={payout.tax}
          />
        </Card>

        <Card description="지급 요청을 보내면 운영팀이 확인 후 지급해요." title="지급 단계">
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

        {payouts.length > 0 && (
          <section>
            <SectionHeader description="사업소득세 3.3%(소득세 3% + 지방소득세 0.3%)를 떼고 보내요. 지급액이 33,334원 미만이면 떼지 않아요." title="지급 내역" />
            <DataTable
              columns={[
                {
                  key: 'requested',
                  header: '요청일',
                  render: (row) => (
                    <div>
                      <p>{formatDate(row.requested_at)}</p>
                      <p className="cl-meta-subtle">
                        {bankName(row.bank_code)} {maskAccountNumber(row.account_number)}
                      </p>
                    </div>
                  ),
                },
                { key: 'gross', header: '정산액', align: 'right', render: (row) => formatKRW(row.gross_amount) },
                { key: 'tax', header: '세금', align: 'right', render: (row) => formatKRW(row.income_tax + row.local_tax) },
                { key: 'net', header: '받을 금액', align: 'right', render: (row) => <span className="cl-emphasis">{formatKRW(row.net_amount)}</span> },
                {
                  key: 'status',
                  header: '상태',
                  render: (row) => (
                    <Badge tone={row.status === 'paid' ? 'brand' : 'amber'}>{row.status === 'paid' ? `지급 완료 ${row.paid_at ? formatDate(row.paid_at) : ''}` : '지급 대기'}</Badge>
                  ),
                },
              ]}
              empty=""
              label="지급 내역"
              rowKey={(row) => row.id}
              rows={payouts}
            />
          </section>
        )}

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
                {
                  key: 'status',
                  header: '상태',
                  render: (row) => {
                    const status = statusDisplay(SETTLEMENT_STATUS, row.status);
                    return <Badge tone={status.tone}>{status.label}</Badge>;
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
              />
            </Card>
          )}
        </section>
      </Stack>
    </Page>
  );
}
