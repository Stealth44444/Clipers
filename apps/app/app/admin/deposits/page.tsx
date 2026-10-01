import Link from 'next/link';
import { BankIcon } from '@phosphor-icons/react/ssr';
import { Card, DataTable, EmptyState, Page, PageHeader, formatKRW } from '@clipers/ui';
import { getSession } from '@/lib/session';
import { ConfirmDepositAction } from '../review-actions';

type Row = { id: string; title: string; total_budget: number; created_at: string; brand: { display_name: string } | null };

export default async function AdminDepositsPage() {
  const { supabase, user } = await getSession();
  const { data } = await supabase
    .from('campaigns')
    .select('id, title, total_budget, created_at, brand:profiles!campaigns_brand_id_fkey(display_name)')
    .eq('status', 'pending_escrow')
    .order('created_at', { ascending: true });
  const rows = (data ?? []) as unknown as Row[];

  return (
    <Page>
      <PageHeader description="브랜드가 입금했다고 알린 캠페인이에요. 통장에서 금액과 입금자명을 확인한 뒤 처리해 주세요." title="입금 확인" />
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
            { key: 'amount', header: '입금 금액', align: 'right', render: (row) => <span className="cl-emphasis">{formatKRW(Number(row.total_budget))}</span> },
            {
              key: 'actions',
              header: '',
              align: 'right',
              render: (row) => <ConfirmDepositAction amount={Number(row.total_budget)} campaignId={row.id} reviewerId={user.id} />,
            },
          ]}
          empty=""
          label="입금 확인 대기"
          rowKey={(row) => row.id}
          rows={rows}
        />
      ) : (
        <Card>
          <EmptyState description="브랜드가 입금을 알리면 여기에 보여요." icon={<BankIcon size={24} />} title="확인할 입금이 없어요" tone="neutral" />
        </Card>
      )}
    </Page>
  );
}
