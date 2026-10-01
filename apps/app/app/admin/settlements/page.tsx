import { Wallet } from 'lucide-react';
import { bankName } from '@clipers/db';
import { Card, DataTable, EmptyState, Page, PageHeader, SectionHeader, Stack, formatKRW } from '@clipers/ui';
import { getSession } from '@/lib/session';
import { PayoutPaidAction } from '../review-actions';
import PayoutCsvButton, { type PayoutRequest } from './payout-csv-button';
import SettlementPanel from './settlement-panel';
import TaxReportForm from './tax-report-form';

type RequestedPayout = {
  id: string;
  gross_amount: number;
  income_tax: number;
  local_tax: number;
  net_amount: number;
  legal_name: string;
  bank_code: string;
  account_number: string;
  requested_at: string;
  creator: { display_name: string } | null;
};

const formatDateTime = (iso: string) =>
  new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

export default async function AdminSettlementsPage() {
  const { supabase } = await getSession();
  const { data } = await supabase
    .from('payouts')
    .select('id, gross_amount, income_tax, local_tax, net_amount, legal_name, bank_code, account_number, requested_at, creator:profiles!payouts_creator_id_fkey(display_name)')
    .eq('status', 'requested')
    .order('requested_at', { ascending: true });
  const requests: PayoutRequest[] = ((data ?? []) as unknown as RequestedPayout[]).map((row) => ({
    id: row.id,
    creatorName: row.creator?.display_name ?? '크리에이터',
    legalName: row.legal_name,
    bank: bankName(row.bank_code),
    accountNumber: row.account_number,
    gross: row.gross_amount,
    incomeTax: row.income_tax,
    localTax: row.local_tax,
    net: row.net_amount,
    requestedAt: row.requested_at,
  }));

  return (
    <Page>
      <PageHeader description="크리에이터의 지급 요청을 처리하고, 지난 완료 주의 조회수 증가분으로 주간 정산을 만들어요." title="정산" />
      <Stack>
        <section>
          <SectionHeader
            action={requests.length > 0 ? <PayoutCsvButton requests={requests} /> : undefined}
            description="이체 화면의 예금주가 실명과 같은지 확인하고, 이체할 금액을 보낸 뒤 지급 완료로 바꿔 주세요. 요청이 오래된 순이에요."
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
                      <p className="cl-meta-subtle">요청 {formatDateTime(request.requestedAt)}</p>
                    </div>
                  ),
                },
                {
                  key: 'account',
                  header: '받는 계좌',
                  render: (request) => (
                    <div>
                      <p className="cl-number">
                        {request.bank} {request.accountNumber}
                      </p>
                      <p className="cl-meta-subtle">예금주 {request.legalName}</p>
                    </div>
                  ),
                },
                { key: 'gross', header: '정산액', align: 'right', render: (request) => formatKRW(request.gross) },
                { key: 'tax', header: '원천징수', align: 'right', render: (request) => formatKRW(request.incomeTax + request.localTax) },
                { key: 'net', header: '이체할 금액', align: 'right', render: (request) => <span className="cl-emphasis">{formatKRW(request.net)}</span> },
                {
                  key: 'actions',
                  header: '',
                  align: 'right',
                  render: (request) => <PayoutPaidAction amount={request.net} legalName={request.legalName} payoutId={request.id} />,
                },
              ]}
              empty=""
              label="지급 요청"
              rowKey={(request) => request.id}
              rows={requests}
            />
          ) : (
            <Card>
              <EmptyState description="크리에이터가 지급을 요청하면 여기에 보여요." icon={<Wallet size={24} />} title="처리할 지급 요청이 없어요" tone="neutral" />
            </Card>
          )}
        </section>

        <section>
          <SectionHeader
            description="지급 완료한 달 기준으로 크리에이터별 지급액과 원천징수액을 모아요. 간이지급명세서(사업소득, 업종코드 940306)와 원천세 신고에 써요. 주민등록번호가 들어 있어 내려받을 때마다 기록이 남아요."
            title="원천세 신고 자료"
          />
          <Card>
            <TaxReportForm />
          </Card>
        </section>

        <section>
          <SectionHeader
            description="매주 월요일 오전 11시에 지난주 정산이 자동으로 만들어져요. 빠진 주가 있으면 '밀린 정산 산출'로 오래된 주부터 채워요."
            title="주간 정산"
          />
          <SettlementPanel />
        </section>
      </Stack>
    </Page>
  );
}
