import type { ShowcaseKind, ShowcaseVideo } from '@/lib/youtube-showcase';

// The brand page's use cases, each shown as a campaign in the brand app's 제출 영상 screen. Brands, creators, counts
// and views are illustrative and fixed. No budget amounts here: next to views they would reveal the brand rate.

export type BrandCaseClip = { creator: string; platform: string; views: number; pending?: boolean };

export type BrandCase = {
  id: 'launch' | 'music' | 'channel';
  label: string;
  lead: string;
  /** The campaign's content type as the brand app names it. */
  kind: string;
  title: string;
  brand: string;
  counts: { all: number; pending: number; approved: number };
  /** Which real YouTube showcase videos (lib/youtube-showcase) give the tiles their thumbnails. */
  showcase: ShowcaseKind;
  clips: BrandCaseClip[];
};

export const BRAND_CASES: BrandCase[] = [
  {
    id: 'launch',
    label: '신제품 알리기',
    lead: '크리에이터들이 제품을 각자 스타일로 소개하는 숏폼을 찍어 올려요. 리뷰, 일상, 상황극처럼 저마다 다른 영상이 한 캠페인에 모여요.',
    kind: 'UGC 캠페인',
    title: '데일리 뷰티 신제품 마스카라 소개',
    brand: '데일리 뷰티',
    counts: { all: 128, pending: 6, approved: 122 },
    showcase: 'ugc',
    clips: [
      { creator: '민지', platform: 'instagram_reels', views: 82_000 },
      { creator: '도윤', platform: 'youtube_shorts', views: 31_000 },
      { creator: '서아', platform: 'tiktok', views: 124_000 },
      { creator: '지호', platform: 'youtube_shorts', views: 67_000 },
      { creator: '유나', platform: 'instagram_reels', views: 29_000, pending: true },
    ],
  },
  {
    id: 'music',
    label: '새 음원 알리기',
    lead: '새 음원을 배경음으로 쓰거나 챌린지에 참여한 숏폼이 여러 플랫폼에 동시에 올라와요. 뮤직비디오와 무대 영상을 클리핑할 수도 있어요.',
    kind: '음악 캠페인',
    title: "신곡 '여름밤' 후렴 챌린지",
    brand: '데모 레코즈',
    counts: { all: 221, pending: 8, approved: 213 },
    showcase: 'music',
    clips: [
      { creator: '하루', platform: 'tiktok', views: 213_000 },
      { creator: '민지', platform: 'instagram_reels', views: 98_000 },
      { creator: '도윤', platform: 'youtube_shorts', views: 55_000 },
      { creator: '서아', platform: 'kakao_shorts', views: 32_000, pending: true },
      { creator: '지호', platform: 'youtube_shorts', views: 141_000 },
    ],
  },
  {
    id: 'channel',
    label: '채널 키우기',
    lead: '긴 영상과 방송의 명장면을 크리에이터들이 숏폼으로 편집해 올려요. 숏폼에서 원본 채널로 이어지는 길이 그만큼 많아져요.',
    kind: '클리핑 캠페인',
    title: '스튜디오 하루 예능 하이라이트 클리핑',
    brand: '스튜디오 하루',
    counts: { all: 39, pending: 2, approved: 37 },
    showcase: 'clipping',
    clips: [
      { creator: '편집왕', platform: 'youtube_shorts', views: 310_000 },
      { creator: '클립데일리', platform: 'tiktok', views: 186_000 },
      { creator: '숏츠랩', platform: 'youtube_shorts', views: 112_000 },
      { creator: '하이라이트', platform: 'x', views: 48_000 },
      { creator: '명장면', platform: 'instagram_reels', views: 93_000, pending: true },
    ],
  },
];

/** The site's own short-form clips (public/media/clips), used where a real YouTube thumbnail is missing. */
export const CLIP_POSTERS = ['/media/clips/beauty.jpg', '/media/clips/drive.jpg', '/media/clips/pet.jpg', '/media/clips/sky.jpg'] as const;

/** One image per tile: the kind's real YouTube thumbnails first, then clip posters shifted by `offset` so cases differ. */
export function caseThumbnails(videos: ShowcaseVideo[] | undefined, count: number, offset: number): string[] {
  const real = (videos ?? []).map((video) => video.thumbnail);
  const posters = Array.from({ length: count }, (_, index) => CLIP_POSTERS[(index + offset) % CLIP_POSTERS.length]);
  return [...real, ...posters].slice(0, count);
}
