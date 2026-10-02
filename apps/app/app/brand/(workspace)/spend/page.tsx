import Link from 'next/link';
import { Receipt } from 'lucide-react';
import { bankName, maskAccountNumber } from '@clipers/db';
import { Badge, Card, DataTable, EmptyState, Page, PageHeader, Stack, StatCard, StatGrid, formatCompactNumber, formatKRW } from '@clipers/ui';
import { getBrandBalance } from '@/lib/brand-balance';
import { getBrandCampaigns } from '@/lib/brand-data';
import BalanceCard from './balance-card';

export default async function BrandSpendPage() {
  const [campaigns, balance] = await Promise.all([
    getBrandCampaigns().then((rows) => rows.filter((campaign) => campaign.status !== 'draft')),
    getBrandBalance(),
  ]);
  const totals = campaigns.reduce(
    (sum, campaign) => ({
      budget: sum.budget + campaign.total_budget,
      spent: sum.spent + campaign.spent,
      // A stopped campaign's remainder moves to the balance, so it is not counted twice.
      remaining: sum.remaining + (campaign.stoppedAt ? 0 : campaign.remaining),
    }),
    { budget: 0, spent: 0, remaining: 0 }
  );
  const openRequest = balance.refunds.find((refund) => refund.kind === 'leftover' && refund.status === 'requested');
  const titles = new Map(campaigns.map((campaign) => [campaign.id, campaign.title]));

  return (
    <Page>
      <PageHeader description="예산은 운영팀 검수를 통과한 클립의 검증 조회수만큼만 쓰여요." title="예산 사용 내역" />
      <Stack>
        <StatGrid>
          <StatCard label="입금한 예산" value={formatKRW(totals.budget)} />
          <StatCard highlight label="사용한 예산" value={formatKRW(totals.spent)} />
          <StatCard label="남은 예산" value={formatKRW(totals.remaining)} />
        </StatGrid>
        {(balance.summary.balance > 0 || openRequest) && (
          <BalanceCard openRequest={openRequest ? { transferAmount: openRequest.transfer_amount } : null} summary={balance.summary} />
        )}
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
              {
                key: 'remaining',
                header: '남음',
                align: 'right',
                render: (campaign) => (campaign.finalizedAt && campaign.stoppedAt ? '잔액으로 옮김' : formatKRW(campaign.remaining)),
              },
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
        {balance.refunds.length > 0 && (
          <DataTable
            columns={[
              {
                key: 'kind',
                header: '반환',
                render: (refund) => (
                  <div>
                    <p>{refund.kind === 'leftover' ? '남은 금액 반환' : '초과 입금 반환'}</p>
                    <p className="cl-meta-subtle">
                      {refund.kind === 'leftover' && refund.bank_code && refund.account_number
                        ? `${bankName(refund.bank_code)} ${maskAccountNumber(refund.account_number)}`
                        : (titles.get(refund.campaign_id ?? '') ?? '입금한 계좌')}
                    </p>
                  </div>
                ),
              },
              {
                key: 'requested',
                header: '요청일',
                render: (refund) => new Date(refund.requested_at).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' }),
              },
              { key: 'amount', header: '보내는 금액', align: 'right', render: (refund) => formatKRW(refund.transfer_amount) },
              {
                key: 'status',
                header: '',
                align: 'right',
                render: (refund) => <Badge tone={refund.status === 'paid' ? 'brand' : 'amber'}>{refund.status === 'paid' ? '보냄' : '처리 중'}</Badge>,
              },
            ]}
            empty=""
            label="반환 내역"
            rowKey={(refund) => refund.id}
            rows={balance.refunds}
          />
        )}
      </Stack>
    </Page>
  );
}
