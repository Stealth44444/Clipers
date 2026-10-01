import { CheckCircleIcon } from '@phosphor-icons/react/ssr';
import { platformLabel } from '@clipers/db';
import { Avatar, ButtonLink, PlatformIcon, ProgressBar, RankMedal, formatCompactKRW, formatKRW } from '@clipers/ui';
import type { CampaignDetail as Detail } from '@/lib/campaigns';
import { appUrl } from '@/lib/urls';
import ActivityChart from './activity-chart';

export const applyUrl = appUrl('/login?next=/creator/campaigns');

/** Shared by the full campaign page and the sheet opened from the marketplace grid. */
export default function CampaignDetail({ campaign }: { campaign: Detail }) {
  return (
    <article className="cl-detail">
      <header className="cl-detail__hero">
        {campaign.coverImageUrl && <img alt="" className="cl-detail__hero-image" src={campaign.coverImageUrl} />}
        <div className="cl-detail__hero-text">
          <div>
            <span className="cl-card-brand cl-detail__brand">
              <Avatar name={campaign.brandName} size="sm" />
              {campaign.brandName}
            </span>
            <h1 className="cl-detail__title">{campaign.title}</h1>
          </div>
          {campaign.description && <p className="cl-detail__summary">{campaign.description}</p>}
        </div>
      </header>

      <div className="cl-detail__bar">
        <ButtonLink href={applyUrl} variant="primary">
          지원하기
        </ButtonLink>
      </div>

      <section className="cl-rate-grid" aria-label="플랫폼별 정산 단가">
        {campaign.platforms.map((platform) => {
          const cap = campaign.clipCaps.find((item) => item.platform === platform);
          return (
            <div className="cl-rate" key={platform}>
              <p className="cl-rate__head">
                <PlatformIcon platform={platform} size={18} />
                {platformLabel(platform)}
              </p>
              <dl className="cl-rate__cells">
                <div>
                  <dt>1천 회당</dt>
                  <dd>{formatKRW(campaign.creatorCpm)}</dd>
                </div>
                <div>
                  <dt>최소 지급</dt>
                  <dd>1천 회부터</dd>
                </div>
                <div>
                  <dt>클립당 최대</dt>
                  <dd>{cap ? formatKRW(cap.maxPayout) : '—'}</dd>
                </div>
              </dl>
            </div>
          );
        })}
      </section>

      <section className="cl-detail__split">
        <div className="cl-panel">
          <p className="cl-panel__label">예산</p>
          <p className="cl-budget-figure">
            {formatCompactKRW(campaign.remainingBudget)} <span className="cl-meta">남음 · 총 {formatCompactKRW(campaign.totalBudget)}</span>
          </p>
          <ProgressBar label="예산 사용률" value={campaign.usageRatio} />
        </div>
        <div className="cl-panel">
          <p className="cl-panel__label">검수</p>
          <p className="cl-budget-figure">
            {campaign.reviewSlaHours}시간 <span className="cl-meta">이내</span>
          </p>
          <p className="cl-meta">제출한 영상은 운영팀이 이 시간 안에 검수해요.</p>
        </div>
      </section>

      {(campaign.requirements || campaign.referenceLinks.length > 0) && (
        <section className="cl-panel">
          <p className="cl-panel__label">꼭 지켜 주세요</p>
          {campaign.requirements && (
            <ul className="cl-checks">
              {campaign.requirements
                .split('\n')
                .map((line) => line.trim())
                .filter(Boolean)
                .map((line) => (
                  <li key={line}>
                    <CheckCircleIcon aria-hidden size={16} />
                    {line}
                  </li>
                ))}
            </ul>
          )}
          {campaign.referenceLinks.length > 0 && (
            <div className="cl-inline">
              {campaign.referenceLinks.map((link, index) => (
                <ButtonLink href={link} key={link} rel="noreferrer" size="sm" target="_blank" variant="secondary">
                  참고 자료 {index + 1}
                </ButtonLink>
              ))}
            </div>
          )}
        </section>
      )}

      {campaign.leaderboard.length > 0 && (
        <section aria-label="상위 크리에이터" className="cl-podium">
          {campaign.leaderboard.map((entry) => (
            <div className="cl-podium__item" key={entry.creatorId}>
              <RankMedal rank={entry.rank as 1 | 2 | 3} size={88} />
              <div className="cl-podium__row">
                <span className="cl-podium__name">
                  <Avatar name={entry.creatorName} size="sm" />
                  {entry.creatorName}
                </span>
                <span className="cl-number cl-emphasis">{formatCompactKRW(entry.totalAmount)}</span>
              </div>
            </div>
          ))}
        </section>
      )}

      <ActivityChart activity={campaign.activity} />
    </article>
  );
}
