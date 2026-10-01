import Link from 'next/link';
import { Badge, DataTable, ProgressBar, formatKRW } from '@clipers/ui';
import type { BrandCampaign } from '@/lib/brand-data';
import { CAMPAIGN_STATUS, CONTENT_TYPE_LABEL, statusDisplay } from '@/lib/status';

export default function CampaignTable({ campaigns }: { campaigns: BrandCampaign[] }) {
  return (
    <DataTable
      columns={[
        {
          key: 'title',
          header: '캠페인',
          render: (campaign) => (
            <div>
              <Link className="cl-table-link" href={`/brand/campaigns/${campaign.id}`}>
                {campaign.title}
              </Link>
              <p className="cl-meta-subtle">
                {campaign.category} · {CONTENT_TYPE_LABEL[campaign.content_type] ?? campaign.content_type}
              </p>
            </div>
          ),
        },
        {
          key: 'status',
          header: '상태',
          render: (campaign) => {
            const status = statusDisplay(CAMPAIGN_STATUS, campaign.status);
            return <Badge tone={status.tone}>{status.label}</Badge>;
          },
        },
        {
          key: 'budget',
          header: '예산 사용',
          render: (campaign) => (
            <div className="cl-budget-cell">
              <ProgressBar label={`${campaign.title} 예산 사용률`} value={campaign.usageRatio} />
              <p className="cl-meta-subtle cl-number">
                {formatKRW(campaign.spent)} / {formatKRW(campaign.total_budget)}
              </p>
            </div>
          ),
        },
        { key: 'clips', header: '받은 클립', align: 'right', render: (campaign) => <span className="cl-number">{campaign.clipCount}</span> },
      ]}
      empty="캠페인이 없어요."
      label="캠페인 목록"
      rowKey={(campaign) => campaign.id}
      rows={campaigns}
    />
  );
}
