// The brand page's use cases, each shown as a campaign in the brand app's 제출 영상 screen. Brands, creators, counts
// and views are illustrative and fixed. No budget amounts here: next to views they would reveal the brand rate.
// Every tile plays one of the site's own vertical clips (public/media/clips, 540×960, muted, about 6s).

export const CASE_CLIPS = [
  'fashion-a', 'fashion-b', 'fashion-d', 'car-a', 'car-b',
  'sky', 'fashion-c', 'pet', 'beauty', 'drive',
  'hoops', 'hoops-close', 'hoops-slow', 'hoops-late', 'hoops-mid',
] as const;

export type CaseClip = (typeof CASE_CLIPS)[number];

/** The clip's video and its poster frame. */
export function clipMedia(clip: CaseClip): { src: string; poster: string } {
  return { src: `/media/clips/${clip}.mp4`, poster: `/media/clips/${clip}.jpg` };
}

export type BrandCaseClip = { creator: string; platform: string; views: number; clip: CaseClip; pending?: boolean };

export type BrandCase = {
  id: 'launch' | 'music' | 'channel';
  label: string;
  lead: string;
  /** The campaign's content type as the brand app names it. */
  kind: string;
  title: string;
  brand: string;
  counts: { all: number; pending: number; approved: number };
  clips: BrandCaseClip[];
};

export const BRAND_CASES: BrandCase[] = [
  {
    id: 'launch',
    label: '신제품 알리기',
    lead: '크리에이터들이 제품을 각자 스타일로 소개하는 숏폼을 찍어 올려요. 리뷰, 일상, 상황극처럼 저마다 다른 영상이 한 캠페인에 모여요.',
    kind: 'UGC 캠페인',
    title: '데일리 무드 가을 신상 토트백 소개',
    brand: '데일리 무드',
    counts: { all: 128, pending: 6, approved: 122 },
    clips: [
      { creator: '민지', platform: 'instagram_reels', views: 82_000, clip: 'fashion-b' },
      { creator: '도윤', platform: 'youtube_shorts', views: 31_000, clip: 'car-a' },
      { creator: '서아', platform: 'tiktok', views: 124_000, clip: 'fashion-a' },
      { creator: '지호', platform: 'youtube_shorts', views: 67_000, clip: 'car-b' },
      { creator: '유나', platform: 'instagram_reels', views: 29_000, clip: 'fashion-d', pending: true },
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
    clips: [
      { creator: '하루', platform: 'tiktok', views: 213_000, clip: 'sky' },
      { creator: '민지', platform: 'instagram_reels', views: 98_000, clip: 'fashion-c' },
      { creator: '도윤', platform: 'youtube_shorts', views: 55_000, clip: 'pet' },
      { creator: '서아', platform: 'kakao_shorts', views: 32_000, clip: 'beauty', pending: true },
      { creator: '지호', platform: 'youtube_shorts', views: 141_000, clip: 'drive' },
    ],
  },
  {
    id: 'channel',
    label: '채널 키우기',
    lead: '긴 영상과 방송의 명장면을 크리에이터들이 숏폼으로 편집해 올려요. 숏폼에서 원본 채널로 이어지는 길이 그만큼 많아져요.',
    kind: '클리핑 캠페인',
    title: '주말 농구 리그 하이라이트 클리핑',
    brand: '하루 스포츠',
    counts: { all: 39, pending: 2, approved: 37 },
    clips: [
      { creator: '편집왕', platform: 'youtube_shorts', views: 310_000, clip: 'hoops' },
      { creator: '클립데일리', platform: 'tiktok', views: 186_000, clip: 'hoops-close' },
      { creator: '숏츠랩', platform: 'youtube_shorts', views: 112_000, clip: 'hoops-slow' },
      { creator: '하이라이트', platform: 'x', views: 48_000, clip: 'hoops-late' },
      { creator: '명장면', platform: 'instagram_reels', views: 93_000, clip: 'hoops-mid', pending: true },
    ],
  },
];
