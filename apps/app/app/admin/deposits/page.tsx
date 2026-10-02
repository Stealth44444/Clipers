import Link from 'next/link';
import { Landmark } from 'lucide-react';
import { depositDue, formatBusinessNumber } from '@clipers/db';
import { Card, DataTable, EmptyState, Page, PageHeader, formatKRW } from '@clipers/ui';
import { loadCampaignFinances } from '@/lib/campaign-finances';
import { getSession } from '@/lib/session';
import { ConfirmDepositAction, DepositMismatchAction } from '../review-actions';

type Billing = { business_number: string; company_name: string; representative: string; invoice_email: string };
type Row = { id: string; title: string; created_at: string; brand_id: string; brand: { display_name: string } | null; total_budget: number; billing: Billing | null; credit_applied: number; received_amount: number };

export default async function AdminDepositsPage() {
  const { supabase } = await getSession();
  const { data } = await supabase
    .from('campaigns')
    .select('id, title, created_at, brand_id, brand:profiles!campaigns_brand_id_fkey(display_name)')
    .eq('status', 'pending_escrow')
    .order('created_at', { ascending: true });
  const campaigns = (data ?? []) as unknown as Omit<Row, 'total_budget' | 'billing' | 'credit_applied' | 'received_amount'>[];
  const ids = campaigns.map((campaign) => campaign.id);
  const [finances, { data: billingRows }, { data: escrowRows }] = await Promise.all([
    loadCampaignFinances(supabase, ids),
    supabase
      .from('brand_billing_profiles')
      .select('brand_id, business_number, company_name, representative, invoice_email')
      .in('brand_id', [...new Set(campaigns.map((campaign) => campaign.brand_id))]),
    supabase.from('campaign_escrow').select('campaign_id, credit_applied, received_amount').in('campaign_id', ids),
  ]);
  const escrowByCampaign = new Map(
    ((escrowRows ?? []) as { campaign_id: string; credit_applied: number; received_amount: number }[]).map((row) => [row.campaign_id, row])
  );
  const billingByBrand = new Map(((billingRows ?? []) as (Billing & { brand_id: string })[]).map((row) => [row.brand_id, row]));
  const rows: Row[] = campaigns.map((campaign) => ({
    ...campaign,
    total_budget: finances.get(campaign.id)?.total_budget ?? 0,
    billing: billingByBrand.get(campaign.brand_id) ?? null,
    credit_applied: Number(escrowByCampaign.get(campaign.id)?.credit_applied ?? 0),
    received_amount: Number(escrowByCampaign.get(campaign.id)?.received_amount ?? 0),
  }));

  return (
    <Page>
      <PageHeader
        description="브랜드가 입금했다고 알린 캠페인이에요. 통장에서 금액(서비스 대금 − 잔액 사용 + 부가세)과 입금자명을 확인해 주세요. 금액이 다르면 받은 금액을 기록하고, 세금계산서는 실제 입금한 금액만큼 홈택스에서 발행해 주세요."
        title="입금 확인"
      />
      {rows.length > 0 ? (
        <DataTable
          columns={[
            {
              key: 'campaign',
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
              key: 'billing',
              header: '세금계산서 정보',
              render: (row) =>
                row.billing ? (
                  <div>
                    <p>
                      {row.billing.company_name} · {formatBusinessNumber(row.billing.business_number)}
                    </p>
                    <p className="cl-meta-subtle">
                      대표 {row.billing.representative} · {row.billing.invoice_email}
                    </p>
                  </div>
                ) : (
                  <span className="cl-meta-subtle">없음</span>
                ),
            },
            {
              key: 'amount',
              header: '입금 금액',
              align: 'right',
              render: (row) => (
                <div>
                  <p className="cl-emphasis">{formatKRW(depositDue(row.total_budget, row.credit_applied))}</p>
                  <p className="cl-meta-subtle">
                    서비스 대금 {formatKRW(row.total_budget)}
                    {row.credit_applied > 0 ? ` − 잔액 ${formatKRW(row.credit_applied)}` : ''} + 부가세
                  </p>
                  {row.received_amount > 0 && <p className="cl-meta-subtle">지금까지 {formatKRW(row.received_amount)} 확인</p>}
                </div>
              ),
            },
            {
              key: 'actions',
              header: '',
              align: 'right',
              render: (row) => {
                const remaining = Math.max(0, depositDue(row.total_budget, row.credit_applied) - row.received_amount);
                return (
                  <div className="cl-inline">
                    <ConfirmDepositAction amount={remaining} campaignId={row.id} />
                    {remaining > 0 && <DepositMismatchAction campaignId={row.id} remaining={remaining} />}
                  </div>
                );
              },
            },
          ]}
          empty=""
          label="입금 확인 대기"
          rowKey={(row) => row.id}
          rows={rows}
        />
      ) : (
        <Card>
          <EmptyState description="브랜드가 입금을 알리면 여기에 보여요." icon={<Landmark size={24} />} title="확인할 입금이 없어요" />
        </Card>
      )}
    </Page>
  );
}
