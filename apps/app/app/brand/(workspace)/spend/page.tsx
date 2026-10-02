import Link from 'next/link';
import { Receipt } from 'lucide-react';
import { Card, DataTable, EmptyState, Page, PageHeader, Stack, StatCard, StatGrid, formatCompactNumber, formatKRW } from '@clipers/ui';
import { getBrandCampaigns } from '@/lib/brand-data';

export default async function BrandSpendPage() {
  const campaigns = (await getBrandCampaigns()).filter((campaign) => campaign.status !== 'draft');
  const totals = campaigns.reduce(
    (sum, campaign) => ({
      budget: sum.budget + campaign.total_budget,
      spent: sum.spent + campaign.spent,
      remaining: sum.remaining + campaign.remaining,
    }),
    { budget: 0, spent: 0, remaining: 0 }
  );

  return (
    <Page>
      <PageHeader description="예산은 운영팀 검수를 통과한 클립의 검증 조회수만큼만 쓰여요." title="예산 사용 내역" />
      <Stack>
        <StatGrid>
          <StatCard label="입금한 예산" value={formatKRW(totals.budget)} />
          <StatCard highlight label="사용한 예산" value={formatKRW(totals.spent)} />
          <StatCard label="남은 예산" value={formatKRW(totals.remaining)} />
        </StatGrid>
        {campaigns.length > 0 ? (
          <DataTable
            columns={[
              {
                key: 'title',
                header: '캠페인',
                render: (campaign) => (
                  <Link className="cl-table-link" href={`/brand/campaigns/${campaign.id}`}>
                    {campaign.title}
                  </Link>
                ),
              },
              { key: 'views', header: '검증 조회수', align: 'right', render: (campaign) => formatCompactNumber(campaign.verifiedViews) },
              { key: 'budget', header: '예산', align: 'right', render: (campaign) => formatKRW(campaign.total_budget) },
              {
                key: 'spent',
                header: '사용',
                align: 'right',
                render: (campaign) => <span className="cl-emphasis">{formatKRW(campaign.spent)}</span>,
              },
              { key: 'remaining', header: '남음', align: 'right', render: (campaign) => formatKRW(campaign.remaining) },
            ]}
            empty=""
            label="캠페인별 예산 사용"
            rowKey={(campaign) => campaign.id}
            rows={campaigns}
          />
        ) : (
          <Card>
            <EmptyState
              description="입금이 확인된 캠페인부터 예산 사용 내역이 쌓여요."
              icon={<Receipt size={24} />}
              title="아직 사용 내역이 없어요"
            />
          </Card>
        )}
      </Stack>
    </Page>
  );
}
