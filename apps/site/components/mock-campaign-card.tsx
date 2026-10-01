import { Avatar, PlatformIcon, ProgressBar, formatCompactKRW, formatKRW } from '@clipers/ui';
import type { ShowcaseVideo } from '@/lib/youtube-showcase';

// Illustrative campaign cards for marketing visuals, in the marketplace card styles. With a real YouTube video they show
// its thumbnail and channel with a brand-style campaign title; budget, rate and participants stay illustrative.
// Display only: no links, no hover.

export type MockCampaign = {
  brand: string;
  title: string;
  platforms: string[];
  remaining: number;
  total: number;
  participants: number;
  /** Cover gradient (no imagery or overlays on covers). */
  cover: string;
};

export const MOCK_CAMPAIGNS: Record<'clipping' | 'ugc' | 'music', MockCampaign[]> = {
  clipping: [
    { brand: '스튜디오 하루', title: '예능 하이라이트 클리핑', platforms: ['youtube_shorts', 'tiktok', 'instagram_reels'], remaining: 3_400_000, total: 5_000_000, participants: 42, cover: 'linear-gradient(135deg, #1d3a2c, #58b982 70%, #cdeb78)' },
    { brand: '게임랩', title: '신작 모바일 게임 플레이 클립', platforms: ['youtube_shorts', 'tiktok'], remaining: 1_800_000, total: 2_000_000, participants: 18, cover: 'linear-gradient(135deg, #1b2440, #4f6bd8 65%, #9fb4ff)' },
    { brand: '라이브온', title: '스트리머 명장면 모음', platforms: ['youtube_shorts', 'instagram_reels', 'x'], remaining: 900_000, total: 1_500_000, participants: 27, cover: 'linear-gradient(135deg, #2a1838, #9b5de5 65%, #f15bb5)' },
  ],
  ugc: [
    { brand: '데일리 뷰티', title: '데일리 립 3초 발색', platforms: ['instagram_reels', 'tiktok'], remaining: 2_600_000, total: 3_000_000, participants: 31, cover: 'linear-gradient(135deg, #3a1d24, #e07a8b 65%, #ffd1c1)' },
    { brand: '홈카페 랩', title: '아침 루틴 속 텀블러 리뷰', platforms: ['youtube_shorts', 'instagram_reels'], remaining: 1_200_000, total: 2_000_000, participants: 12, cover: 'linear-gradient(135deg, #2e2418, #c08a4b 65%, #f3d9a4)' },
    { brand: '핏앤런', title: '러닝화 첫 10km 후기', platforms: ['youtube_shorts', 'tiktok', 'naver_clip'], remaining: 4_100_000, total: 5_000_000, participants: 24, cover: 'linear-gradient(135deg, #14302f, #2bb3a3 65%, #a6f0d8)' },
  ],
  music: [
    { brand: '데모 레코즈', title: "신곡 '여름밤' 후렴 챌린지", platforms: ['youtube_shorts', 'tiktok', 'instagram_reels'], remaining: 2_850_000, total: 3_000_000, participants: 56, cover: 'linear-gradient(135deg, #10263a, #3b8bd0 60%, #ffcf7a)' },
    { brand: '인디 스테이지', title: '인디 밴드 라이브 클립 편집', platforms: ['youtube_shorts', 'kakao_shorts'], remaining: 1_712_000, total: 2_000_000, participants: 9, cover: 'linear-gradient(135deg, #2b1a12, #e2733b 60%, #ffd08a)' },
    { brand: '비트하우스', title: '댄스 챌린지 15초 버전', platforms: ['tiktok', 'instagram_reels'], remaining: 600_000, total: 1_000_000, participants: 38, cover: 'linear-gradient(135deg, #1f1238, #7b5cff 60%, #6ee7f9)' },
  ],
};

export default function MockCampaignCard({ campaign, video, rate = 800 }: { campaign: MockCampaign; video?: ShowcaseVideo; rate?: number }) {
  const brand = video?.channel ?? campaign.brand;
  return (
    <div aria-hidden className="cl-ccard cl-ccard--mock">
      <div className="cl-ccard__cover" style={video ? undefined : { background: campaign.cover }}>
        {video && <img alt="" className="cl-ccard__image" loading="lazy" referrerPolicy="no-referrer" src={video.thumbnail} />}
      </div>
      <div className="cl-ccard__body">
        <p className="cl-ccard__brand">
          <Avatar name={brand} size="sm" src={video?.avatar} />
          <span className="cl-ccard__brand-name">{brand}</span>
        </p>
        <p className="cl-ccard__title">{video?.campaign ?? campaign.title}</p>
        <div className="cl-ccard__row">
          <span className="cl-ccard__platforms">
            {campaign.platforms.map((platform) => (
              <PlatformIcon key={platform} platform={platform} size={16} />
            ))}
          </span>
          <span className="cl-ccard__rate">
            1천 회당 <strong>{formatKRW(rate)}</strong>
          </span>
        </div>
      </div>
      <div className="cl-ccard__footer">
        <div className="cl-ccard__row">
          <span className="cl-ccard__budget">
            남은 예산 <strong>{formatCompactKRW(campaign.remaining)}</strong> / {formatCompactKRW(campaign.total)}
          </span>
          <span className="cl-ccard__participants">참여 {campaign.participants}명</span>
        </div>
        <ProgressBar label="예산 사용률" value={1 - campaign.remaining / campaign.total} />
      </div>
    </div>
  );
}
