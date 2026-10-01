import Link from 'next/link';
import { ImageIcon, User } from 'lucide-react';
import { Avatar, PlatformIcons, ProgressBar, formatCompactKRW, formatKRW, relativeTimeKo } from '@clipers/ui';
import type { MarketCampaign } from '@/lib/campaigns';

export default function CampaignCard({ campaign }: { campaign: MarketCampaign }) {
  return (
    <Link className="cl-mcard" href={`/campaigns/${campaign.id}`} scroll={false}>
      <div className="cl-mcard__media">
        {campaign.coverImageUrl ? <img alt="" src={campaign.coverImageUrl} /> : <ImageIcon aria-hidden size={28} />}
      </div>
      <div className="cl-mcard__body">
        <div className="cl-mcard__meta">
          <span className="cl-mcard__brand">
            <Avatar name={campaign.brandName} size="sm" />
            <span className="cl-mcard__brand-name">{campaign.brandName}</span>
            <span className="cl-mcard__age">· {relativeTimeKo(new Date(campaign.createdAt))}</span>
          </span>
          <PlatformIcons label={`플랫폼 ${campaign.platforms.length}개`} platforms={campaign.platforms} size="sm" />
        </div>
        <h3 className="cl-mcard__title">{campaign.title}</h3>
        <div className="cl-mcard__stats">
          <span className="cl-mcard__budget">
            <strong>{formatCompactKRW(campaign.spentBudget)}</strong> / {formatCompactKRW(campaign.totalBudget)}
          </span>
          <span className="cl-inline">
            <span className="cl-pill">
              <User aria-hidden size={13} />
              {campaign.participantCount}
            </span>
            <span className="cl-pill cl-pill--brand">{formatKRW(campaign.creatorCpm)}/1K</span>
          </span>
        </div>
        <ProgressBar label={`${campaign.title} 예산 사용률`} value={campaign.usageRatio} />
      </div>
    </Link>
  );
}
