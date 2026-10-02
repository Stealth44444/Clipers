import Link from 'next/link';
import { Landmark } from 'lucide-react';
import { depositAmount, formatBusinessNumber } from '@clipers/db';
import { Card, DataTable, EmptyState, Page, PageHeader, formatKRW } from '@clipers/ui';
import { loadCampaignFinances } from '@/lib/campaign-finances';
import { getSession } from '@/lib/session';
import { ConfirmDepositAction } from '../review-actions';

type Billing = { business_number: string; company_name: string; representative: string; invoice_email: string };
type Row = { id: string; title: string; created_at: string; brand_id: string; brand: { display_name: string } | null; total_budget: number; billing: Billing | null };

export default async function AdminDepositsPage() {
  const { supabase, user } = await getSession();
  const { data } = await supabase
    .from('campaigns')
    .select('id, title, created_at, brand_id, brand:profiles!campaigns_brand_id_fkey(display_name)')
    .eq('status', 'pending_escrow')
    .order('created_at', { ascending: true });
  const campaigns = (data ?? []) as unknown as Omit<Row, 'total_budget' | 'billing'>[];
  const [finances, { data: billingRows }] = await Promise.all([
    loadCampaignFinances(supabase, campaigns.map((campaign) => campaign.id)),
    supabase
      .from('brand_billing_profiles')
      .select('brand_id, business_number, company_name, representative, invoice_email')
      .in('brand_id', [...new Set(campaigns.map((campaign) => campaign.brand_id))]),
  ]);
  const billingByBrand = new Map(((billingRows ?? []) as (Billing & { brand_id: string })[]).map((row) => [row.brand_id, row]));
  const rows: Row[] = campaigns.map((campaign) => ({
    ...campaign,
    total_budget: finances.get(campaign.id)?.total_budget ?? 0,
    billing: billingByBrand.get(campaign.brand_id) ?? null,
  }));

  return (
    <Page>
      <PageHeader
        description="브랜드가 입금했다고 알린 캠페인이에요. 통장에서 금액(서비스 대금 + 부가세)과 입금자명을 확인한 뒤 처리하고, 세금계산서 정보로 홈택스에서 계산서를 발행해 주세요."
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
                  <p className="cl-emphasis">{formatKRW(depositAmount(row.total_budget))}</p>
                  <p className="cl-meta-subtle">서비스 대금 {formatKRW(row.total_budget)} + 부가세</p>
                </div>
              ),
            },
            {
              key: 'actions',
              header: '',
              align: 'right',
              render: (row) => <ConfirmDepositAction amount={depositAmount(row.total_budget)} campaignId={row.id} reviewerId={user.id} />,
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
