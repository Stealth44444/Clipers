import { Wallet } from 'lucide-react';
import { fetchAllRows } from '@clipers/db';
import { Card, DataTable, EmptyState, Page, PageHeader, SectionHeader, Stack, formatKRW } from '@clipers/ui';
import { getSession } from '@/lib/session';
import { PayoutPaidAction } from '../review-actions';
import PayoutCsvButton, { type PayoutRequest } from './payout-csv-button';
import SettlementPanel from './settlement-panel';

type RequestedRow = {
  id: string;
  creator_id: string;
  amount: number | string;
  withholding_amount: number | string;
  period: string;
  creator: { display_name: string } | null;
};

export default async function AdminSettlementsPage() {
  const { supabase } = await getSession();
  // Every requested settlement, whatever week it came from: creators may save up for weeks before asking.
  const rows = (await fetchAllRows((from, to) =>
    supabase
      .from('settlements')
      .select('id, creator_id, amount, withholding_amount, period, creator:profiles!settlements_creator_id_fkey(display_name)')
      .eq('status', 'requested')
      .order('id')
      .range(from, to)
  )) as unknown as RequestedRow[];

  const byCreator = new Map<string, PayoutRequest>();
  for (const row of rows) {
    const request = byCreator.get(row.creator_id) ?? {
      creatorId: row.creator_id,
      creatorName: row.creator?.display_name ?? '크리에이터',
      settlementIds: [],
      firstPeriod: row.period,
      lastPeriod: row.period,
      gross: 0,
      withholding: 0,
    };
    request.settlementIds.push(row.id);
    request.gross += Number(row.amount);
    request.withholding += Number(row.withholding_amount);
    if (row.period < request.firstPeriod) request.firstPeriod = row.period;
    if (row.period > request.lastPeriod) request.lastPeriod = row.period;
    byCreator.set(row.creator_id, request);
  }
  const requests = [...byCreator.values()].sort((left, right) => left.firstPeriod.localeCompare(right.firstPeriod));

  return (
    <Page>
      <PageHeader
        description="크리에이터의 지급 요청을 처리하고, 지난 완료 주의 조회수 증가분으로 주간 정산을 만들어요."
        title="정산"
      />
      <Stack>
        <section>
          <SectionHeader
            action={requests.length > 0 ? <PayoutCsvButton requests={requests} /> : undefined}
            description="이체를 마친 뒤 지급 완료로 바꿔 주세요. 요청이 오래된 순이에요."
            title="지급 요청"
          />
          {requests.length > 0 ? (
            <DataTable
              columns={[
                {
                  key: 'creator',
                  header: '크리에이터',
                  render: (request) => (
                    <div>
                      <p>{request.creatorName}</p>
                      <p className="cl-meta-subtle">
                        정산 {request.settlementIds.length}건 ·{' '}
                        {request.firstPeriod === request.lastPeriod ? `${request.firstPeriod} 주` : `${request.firstPeriod} ~ ${request.lastPeriod} 주`}
                      </p>
                    </div>
                  ),
                },
                { key: 'gross', header: '정산액', align: 'right', render: (request) => formatKRW(request.gross) },
                { key: 'withholding', header: '원천징수', align: 'right', render: (request) => formatKRW(request.withholding) },
                {
                  key: 'net',
                  header: '이체할 금액',
                  align: 'right',
                  render: (request) => <span className="cl-emphasis">{formatKRW(request.gross - request.withholding)}</span>,
                },
                {
                  key: 'actions',
                  header: '',
                  align: 'right',
                  render: (request) => (
                    <PayoutPaidAction
                      amount={request.gross - request.withholding}
                      creatorName={request.creatorName}
                      settlementIds={request.settlementIds}
                    />
                  ),
                },
              ]}
              empty=""
              label="지급 요청"
              rowKey={(request) => request.creatorId}
              rows={requests}
            />
          ) : (
            <Card>
              <EmptyState description="크리에이터가 지급을 요청하면 여기에 보여요." icon={<Wallet size={24} />} title="처리할 지급 요청이 없어요" tone="neutral" />
            </Card>
          )}
        </section>

        <section>
          <SectionHeader description="정산을 만들면 크리에이터의 받을 금액에 더해져요." title="주간 정산" />
          <SettlementPanel />
        </section>
      </Stack>
    </Page>
  );
}
