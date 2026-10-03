import Link from 'next/link';
import { Landmark } from 'lucide-react';
import { depositDue, formatBusinessNumber } from '@clipers/db';
import { Card, DataTable, EmptyState, Page, PageHeader, SectionHeader, Stack, formatKRW } from '@clipers/ui';
import { loadCampaignFinances } from '@/lib/campaign-finances';
import { getSession } from '@/lib/session';
import { ConfirmDepositAction, DepositMismatchAction, type DepositTarget } from '../review-actions';

type Billing = { business_number: string; company_name: string; representative: string; invoice_email: string };
type Brand = { display_name: string } | null;
type CampaignRow = { id: string; title: string; brand_id: string; brand: Brand };
type TopUpRow = {
  id: string;
  campaign_id: string;
  brand_id: string;
  amount: number;
  credit_applied: number;
  received_amount: number;
  campaign: { title: string; status: string } | null;
  brand: Brand;
};
/** One deposit waiting for the operator: a campaign's first deposit or a budget top-up. */
type Row = {
  key: string;
  campaignId: string;
  title: string;
  brandName: string;
  billing: Billing | null;
  service: number;
  credit: number;
  received: number;
  target: DepositTarget;
  note?: string;
};

export default async function AdminDepositsPage() {
  const { supabase } = await getSession();
  const [{ data: campaignData }, { data: topupData }] = await Promise.all([
    supabase
      .from('campaigns')
      .select('id, title, brand_id, brand:profiles!campaigns_brand_id_fkey(display_name)')
      .eq('status', 'pending_escrow')
      .order('created_at', { ascending: true }),
    supabase
      .from('campaign_topups')
      .select('id, campaign_id, brand_id, amount, credit_applied, received_amount, campaign:campaigns(title, status), brand:profiles!campaign_topups_brand_id_fkey(display_name)')
      .eq('status', 'pending')
      .order('requested_at', { ascending: true }),
  ]);
  const campaigns = (campaignData ?? []) as unknown as CampaignRow[];
  const topups = (topupData ?? []) as unknown as TopUpRow[];
  const ids = campaigns.map((campaign) => campaign.id);
  const brandIds = [...new Set([...campaigns, ...topups].map((row) => row.brand_id))];
  const [finances, { data: billingRows }, { data: escrowRows }] = await Promise.all([
    loadCampaignFinances(supabase, ids),
    supabase.from('brand_billing_profiles').select('brand_id, business_number, company_name, representative, invoice_email').in('brand_id', brandIds),
    supabase.from('campaign_escrow').select('campaign_id, credit_applied, received_amount').in('campaign_id', ids),
  ]);
  const escrowByCampaign = new Map(
    ((escrowRows ?? []) as { campaign_id: string; credit_applied: number; received_amount: number }[]).map((row) => [row.campaign_id, row])
  );
  const billingByBrand = new Map(((billingRows ?? []) as (Billing & { brand_id: string })[]).map((row) => [row.brand_id, row]));

  const deposits: Row[] = campaigns.map((campaign) => ({
    key: campaign.id,
    campaignId: campaign.id,
    title: campaign.title,
    brandName: campaign.brand?.display_name ?? '브랜드',
    billing: billingByBrand.get(campaign.brand_id) ?? null,
    service: finances.get(campaign.id)?.total_budget ?? 0,
    credit: Number(escrowByCampaign.get(campaign.id)?.credit_applied ?? 0),
    received: Number(escrowByCampaign.get(campaign.id)?.received_amount ?? 0),
    target: { campaignId: campaign.id },
  }));
  const topupRows: Row[] = topups.map((topup) => ({
    key: topup.id,
    campaignId: topup.campaign_id,
    title: topup.campaign?.title ?? '캠페인',
    brandName: topup.brand?.display_name ?? '브랜드',
    billing: billingByBrand.get(topup.brand_id) ?? null,
    service: Number(topup.amount),
    credit: Number(topup.credit_applied),
    received: Number(topup.received_amount),
    target: { topupId: topup.id },
    note: topup.campaign?.status === 'closed' ? '확인하면 종료된 캠페인이 다시 열려요' : undefined,
  }));

  const table = (rows: Row[], label: string) => (
    <DataTable
      columns={[
        {
          key: 'campaign',
          header: '캠페인',
          render: (row) => (
            <div>
              <Link className="cl-table-link" href={`/admin/campaigns/${row.campaignId}`}>
                {row.title}
              </Link>
              <p className="cl-meta-subtle">{row.brandName}</p>
              {row.note && <p className="cl-meta-subtle">{row.note}</p>}
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
              <p className="cl-emphasis">{formatKRW(depositDue(row.service, row.credit))}</p>
              <p className="cl-meta-subtle">
                서비스 대금 {formatKRW(row.service)}
                {row.credit > 0 ? ` − 잔액 ${formatKRW(row.credit)}` : ''} + 부가세
              </p>
              {row.received > 0 && <p className="cl-meta-subtle">지금까지 {formatKRW(row.received)} 확인</p>}
            </div>
          ),
        },
        {
          key: 'actions',
          header: '',
          align: 'right',
          render: (row) => {
            const remaining = Math.max(0, depositDue(row.service, row.credit) - row.received);
            return (
              <div className="cl-inline">
                <ConfirmDepositAction amount={remaining} target={row.target} />
                {remaining > 0 && <DepositMismatchAction remaining={remaining} target={row.target} />}
              </div>
            );
          },
        },
      ]}
      empty=""
      label={label}
      rowKey={(row) => row.key}
      rows={rows}
    />
  );

  return (
    <Page>
      <PageHeader
        description="브랜드가 입금했다고 알린 건이에요. 통장에서 금액(서비스 대금 − 잔액 사용 + 부가세)과 입금자명을 확인해 주세요. 금액이 다르면 받은 금액을 기록하고, 세금계산서는 실제 입금한 금액만큼 홈택스에서 발행해 주세요."
        title="입금 확인"
      />
      <Stack>
        <section>
          <SectionHeader description="확인하면 캠페인이 공개돼요." title="캠페인 입금" />
          {deposits.length > 0 ? (
            table(deposits, '캠페인 입금 확인 대기')
          ) : (
            <Card>
              <EmptyState description="브랜드가 입금을 알리면 여기에 보여요." icon={<Landmark size={24} />} title="확인할 입금이 없어요" />
            </Card>
          )}
        </section>
        <section>
          <SectionHeader description="확인하면 증액분이 캠페인 예산에 더해져요." title="예산 증액" />
          {topupRows.length > 0 ? (
            table(topupRows, '예산 증액 입금 확인 대기')
          ) : (
            <Card>
              <EmptyState description="브랜드가 예산을 늘리고 입금을 알리면 여기에 보여요." icon={<Landmark size={24} />} title="확인할 증액이 없어요" />
            </Card>
          )}
        </section>
      </Stack>
    </Page>
  );
}
