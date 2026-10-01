import Link from 'next/link';
import { platformLabels } from '@clipers/db';
import { Avatar, Badge, MediaCard, ProgressBar, formatKRW } from '@clipers/ui';
import type { MarketCampaign } from '@/lib/campaigns';

export default function CampaignCard({ campaign }: { campaign: MarketCampaign }) {
  return (
    <Link className="cl-card-link" href={`/campaigns/${campaign.id}`} scroll={false}>
      <MediaCard
        image={campaign.coverImageUrl}
        meta={platformLabels(campaign.platforms)}
        title={campaign.title}
      >
        <span className="cl-card-brand">
          <Avatar name={campaign.brandName} size="sm" />
          {campaign.brandName} · {campaign.category}
        </span>
        <div className="cl-card-stats">
          <Badge tone="brand">1천 회당 {formatKRW(campaign.creatorCpm)}</Badge>
          <span className="cl-meta-subtle cl-number">{formatKRW(campaign.remainingBudget)} 남음</span>
        </div>
        <ProgressBar label={`${campaign.title} 예산 사용률`} value={campaign.usageRatio} />
      </MediaCard>
    </Link>
  );
}
