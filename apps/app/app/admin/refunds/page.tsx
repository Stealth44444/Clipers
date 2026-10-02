import { Undo2 } from 'lucide-react';
import { bankName, businessDaysSince, formatBusinessNumber } from '@clipers/db';
import { Badge, Card, DataTable, EmptyState, Page, PageHeader, formatKRW } from '@clipers/ui';
import { getSession } from '@/lib/session';
import { RefundPaidAction } from '../review-actions';

type Billing = { brand_id: string; business_number: string; company_name: string };
type Row = {
  id: string;
  brand_id: string;
  kind: 'leftover' | 'over_deposit';
  service_amount: number | null;
  transfer_amount: number;
  bank_code: string | null;
  account_number: string | null;
  account_holder: string | null;
  requested_at: string;
  brand: { display_name: string } | null;
  campaign: { title: string } | null;
};

/** Returns waiting to be sent: balances brands asked for, and deposits that came in over what was asked. */
export default async function AdminRefundsPage() {
  const { supabase } = await getSession();
  const { data } = await supabase
    .from('brand_refunds')
    .select(
      'id, brand_id, kind, service_amount, transfer_amount, bank_code, account_number, account_holder, requested_at, brand:profiles!brand_refunds_brand_id_fkey(display_name), campaign:campaigns(title)'
    )
    .eq('status', 'requested')
    .order('requested_at', { ascending: true });
  const rows = (data ?? []) as unknown as Row[];
  const { data: billingRows } = await supabase
    .from('brand_billing_profiles')
    .select('brand_id, business_number, company_name')
    .in('brand_id', [...new Set(rows.map((row) => row.brand_id))]);
  const billing = new Map(((billingRows ?? []) as Billing[]).map((row) => [row.brand_id, row]));

  return (
    <Page>
      <PageHeader
        description="요청일부터 영업일 7일 안에 보내야 해요. 남은 금액 반환은 예금주가 세금계산서 상호와 같은지 확인하고, 보낸 뒤 홈택스에서 서비스 대금만큼 수정세금계산서를 발행해 주세요. 초과 입금은 입금한 계좌로 돌려보내요."
        title="반환"
      />
      {rows.length > 0 ? (
        <DataTable
          columns={[
            {
              key: 'brand',
              header: '브랜드',
              render: (row) => {
                const days = businessDaysSince(row.requested_at);
                return (
                  <div>
                    <p>{row.brand?.display_name ?? '브랜드'}</p>
                    <p className="cl-inline cl-meta-subtle">
                      <Badge tone={days >= 7 ? 'tomato' : days >= 5 ? 'amber' : 'neutral'}>영업일 {days}일째</Badge>
                    </p>
                  </div>
                );
              },
            },
            {
              key: 'kind',
              header: '종류',
              render: (row) =>
                row.kind === 'leftover' ? (
                  <div>
                    <p>남은 금액 반환</p>
                    <p className="cl-meta-subtle">수정세금계산서 −{formatKRW(row.service_amount ?? 0)}</p>
                  </div>
                ) : (
                  <div>
                    <p>초과 입금 반환</p>
                    <p className="cl-meta-subtle">{row.campaign?.title ?? '캠페인'}</p>
                  </div>
                ),
            },
            {
              key: 'account',
              header: '보낼 계좌',
              render: (row) => {
                const company = billing.get(row.brand_id);
                return row.kind === 'leftover' && row.bank_code ? (
                  <div>
                    <p className="cl-number">
                      {bankName(row.bank_code)} {row.account_number}
                    </p>
                    <p className="cl-meta-subtle">
                      예금주 {row.account_holder}
                      {company ? ` · ${company.company_name} ${formatBusinessNumber(company.business_number)}` : ''}
                    </p>
                  </div>
                ) : (
                  <span className="cl-meta-subtle">입금한 계좌로</span>
                );
              },
            },
            { key: 'amount', header: '보낼 금액', align: 'right', render: (row) => <span className="cl-emphasis">{formatKRW(row.transfer_amount)}</span> },
            {
              key: 'actions',
              header: '',
              align: 'right',
              render: (row) => <RefundPaidAction amount={row.transfer_amount} refundId={row.id} />,
            },
          ]}
          empty=""
          label="보낼 반환"
          rowKey={(row) => row.id}
          rows={rows}
        />
      ) : (
        <Card>
          <EmptyState description="브랜드가 반환을 요청하거나 초과 입금이 기록되면 여기에 보여요." icon={<Undo2 size={24} />} title="보낼 반환이 없어요" />
        </Card>
      )}
    </Page>
  );
}
