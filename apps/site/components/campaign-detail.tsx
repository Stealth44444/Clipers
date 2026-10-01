import { CalendarClock, ExternalLink, Users } from 'lucide-react';
import { platformLabel } from '@clipers/db';
import { Avatar, Badge, ButtonLink, Card, LineChart, ProgressBar, formatCompactNumber, formatKRW } from '@clipers/ui';
import type { CampaignDetail as Detail } from '@/lib/campaigns';
import { appUrl } from '@/lib/urls';

const CONTENT_TYPE_LABEL: Record<string, string> = { clipping: '클리핑', ugc: 'UGC' };
export const applyUrl = appUrl('/login?next=/creator/campaigns');

/** Shared by the full campaign page and the sheet opened from the marketplace grid. */
export default function CampaignDetail({ campaign }: { campaign: Detail }) {
  const latestViews = campaign.views.at(-1)?.totalViews ?? 0;
  const chartPoints = campaign.views.map((point) => {
    const [, month, day] = point.date.split('-').map(Number);
    return { label: `${month}/${day}`, value: point.totalViews };
  });

  return (
    <article className="cl-detail">
      <div className="cl-detail__banner">{campaign.coverImageUrl && <img alt="" src={campaign.coverImageUrl} />}</div>

      <header className="cl-detail__head">
        <div>
          <span className="cl-card-brand">
            <Avatar name={campaign.brandName} size="sm" />
            {campaign.brandName}
          </span>
          <h1 className="cl-detail__title">{campaign.title}</h1>
          <div className="cl-detail__meta">
            <Badge tone="brand">모집 중</Badge>
            <span>{campaign.category}</span>·<span>{CONTENT_TYPE_LABEL[campaign.contentType] ?? campaign.contentType}</span>·
            <span className="cl-inline">
              <Users size={14} /> {campaign.participantCount}명 참여
            </span>
            ·
            <span className="cl-inline">
              <CalendarClock size={14} /> 검수 {campaign.reviewSlaHours}시간 이내
            </span>
          </div>
        </div>
        <ButtonLink href={applyUrl} size="lg" variant="primary">
          지원하기
        </ButtonLink>
      </header>

      <Card description="검증된 조회수 1천 회마다 지급돼요. 클립 하나가 받을 수 있는 금액에는 상한이 있어요." title="정산 단가">
        <div className="cl-rate-grid">
          {campaign.platforms.map((platform) => {
            const cap = campaign.clipCaps.find((item) => item.platform === platform);
            return (
              <div className="cl-rate" key={platform}>
                <span className="cl-rate__platform">{platformLabel(platform)}</span>
                <span className="cl-rate__value">{formatKRW(campaign.creatorCpm)}</span>
                <span className="cl-rate__cap">1천 회당 · 클립당 최대 {cap ? formatKRW(cap.maxPayout) : '—'}</span>
              </div>
            );
          })}
        </div>
      </Card>

      <Card title="예산">
        <div className="cl-stack-tight">
          <p className="cl-budget-figure">
            {formatKRW(campaign.remainingBudget)} <span className="cl-meta">남음 · 총 {formatKRW(campaign.totalBudget)}</span>
          </p>
          <ProgressBar label="예산 사용률" value={campaign.usageRatio} />
        </div>
      </Card>

      {(campaign.description || campaign.requirements || campaign.referenceLinks.length > 0) && (
        <Card title="브리프">
          <div className="cl-stack-tight">
            {campaign.description && <p className="cl-detail__body">{campaign.description}</p>}
            {campaign.requirements && (
              <div>
                <p className="cl-field__label">꼭 지켜 주세요</p>
                <p className="cl-detail__body cl-meta">{campaign.requirements}</p>
              </div>
            )}
            {campaign.referenceLinks.length > 0 && (
              <div className="cl-inline">
                {campaign.referenceLinks.map((link, index) => (
                  <ButtonLink href={link} icon={<ExternalLink size={14} />} key={link} rel="noreferrer" size="sm" target="_blank" variant="secondary">
                    참고 자료 {index + 1}
                  </ButtonLink>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {campaign.leaderboard.length > 0 && (
        <Card description={`참여 크리에이터 평균 정산액 ${formatKRW(campaign.averageEarning)}`} title="상위 크리에이터">
          <div className="cl-podium">
            {campaign.leaderboard.map((entry) => (
              <div className="cl-podium__item" key={entry.creatorId}>
                <span className="cl-podium__rank">{entry.rank}</span>
                <Avatar name={entry.creatorName} size="sm" />
                <div>
                  <p>{entry.creatorName}</p>
                  <p className="cl-meta-subtle cl-number">{formatKRW(entry.totalAmount)}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card description="승인된 모든 클립의 누적 조회수예요." title={`조회수 ${formatCompactNumber(latestViews)}`}>
        {chartPoints.length > 0 ? (
          <LineChart label="캠페인 누적 조회수" points={chartPoints} />
        ) : (
          <p className="cl-meta">아직 집계된 조회수가 없어요.</p>
        )}
      </Card>
    </article>
  );
}
