import Link from 'next/link';
import { Avatar, PlatformIcon, ProgressBar, formatCompactKRW, formatKRW, relativeTimeKo } from '@clipers/ui';
import type { MarketCampaign } from '@/lib/campaigns';

/** Rate and platforms ride on the cover as glass chips; the body keeps only brand, title and budget. */
export default function CampaignCard({ campaign }: { campaign: MarketCampaign }) {
  return (
    <Link className="cl-ccard" href={`/campaigns/${campaign.id}`} scroll={false}>
      <div className="cl-ccard__cover">
        {campaign.coverImageUrl && <img alt="" className="cl-ccard__image" src={campaign.coverImageUrl} />}
        <span className="cl-ccard__rate">
          <strong>{formatKRW(campaign.creatorCpm)}</strong> / 1천 회
        </span>
        <span aria-label={`플랫폼 ${campaign.platforms.length}개`} className="cl-ccard__platforms" role="img">
          {campaign.platforms.slice(0, 4).map((platform) => (
            <span className="cl-ccard__platform" key={platform}>
              <PlatformIcon platform={platform} size={12} />
            </span>
          ))}
          {campaign.platforms.length > 4 && <span className="cl-ccard__platform cl-ccard__more">+{campaign.platforms.length - 4}</span>}
        </span>
      </div>

      <div className="cl-ccard__body">
        <p className="cl-ccard__brand">
          <Avatar name={campaign.brandName} size="sm" />
          <span className="cl-ccard__brand-name">{campaign.brandName}</span>
          <span className="cl-ccard__dot">·</span>
          <span>{relativeTimeKo(new Date(campaign.createdAt))}</span>
        </p>
        <h3 className="cl-ccard__title">{campaign.title}</h3>
      </div>

      <div className="cl-ccard__footer">
        <div className="cl-ccard__figures">
          <span>
            남은 예산 <strong>{formatCompactKRW(campaign.remainingBudget)}</strong>
          </span>
          <span>참여 {campaign.participantCount}명</span>
        </div>
        <ProgressBar label={`${campaign.title} 예산 사용률`} value={campaign.usageRatio} />
      </div>
    </Link>
  );
}
