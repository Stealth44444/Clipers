import Link from 'next/link';
import { Avatar, PlatformIcon, ProgressBar, formatCompactKRW, formatKRW, relativeTimeKo } from '@clipers/ui';
import type { MarketCampaign } from '@/lib/campaigns';

/** The cover stays clean; brand, title, platforms, rate and budget read top to bottom in the body. */
export default function CampaignCard({ campaign }: { campaign: MarketCampaign }) {
  return (
    <Link className="cl-ccard" href={`/campaigns/${campaign.id}`} scroll={false}>
      <div className="cl-ccard__cover">
        {campaign.coverImageUrl && <img alt="" className="cl-ccard__image" src={campaign.coverImageUrl} />}
      </div>

      <div className="cl-ccard__body">
        <p className="cl-ccard__brand">
          <Avatar name={campaign.brandName} size="sm" />
          <span className="cl-ccard__brand-name">{campaign.brandName}</span>
          <span className="cl-ccard__dot">·</span>
          <span>{relativeTimeKo(new Date(campaign.createdAt))}</span>
        </p>
        <h3 className="cl-ccard__title">{campaign.title}</h3>
        <div className="cl-ccard__row">
          <span aria-label={`플랫폼 ${campaign.platforms.length}개`} className="cl-ccard__platforms" role="img">
            {campaign.platforms.map((platform) => (
              <PlatformIcon key={platform} platform={platform} size={16} />
            ))}
          </span>
          <span className="cl-ccard__rate">
            1천 회당 <strong>{formatKRW(campaign.creatorCpm)}</strong>
          </span>
        </div>
      </div>

      <div className="cl-ccard__footer">
        <div className="cl-ccard__row">
          <span className="cl-ccard__budget">
            남은 예산 <strong>{formatCompactKRW(campaign.remainingBudget)}</strong> / {formatCompactKRW(campaign.totalBudget)}
          </span>
          <span className="cl-ccard__participants">참여 {campaign.participantCount}명</span>
        </div>
        <ProgressBar label={`${campaign.title} 예산 사용률`} value={campaign.usageRatio} />
      </div>
    </Link>
  );
}
