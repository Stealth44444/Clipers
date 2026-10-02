// The brand page's use cases, each shown as a campaign in the brand app's 제출 영상 screen. Brands, creators, counts
// and views are illustrative and fixed. No budget amounts here: next to views they would reveal the brand rate.
// Every tile plays one of the site's own vertical clips (public/media/clips, 540×960, muted, about 6s). A clipping
// campaign shows one source cut several ways, which is what clipping is; a UGC campaign shows different sources. A
// clip that appears in two campaigns keeps its creator's name, as one creator joins several campaigns. Each tile is
// finished differently (caption, format, colour) so four cuts of one source read as four creators' edits.

export const CASE_CLIPS = [
  'fashion-b', 'fashion-c', 'fashion-d', 'beauty', 'pet',
  'car-a', 'car-b', 'car-c', 'car-d',
  'drive', 'drive-close', 'drive-slow', 'drive-late',
  'sky', 'sky-close', 'sky-slow', 'sky-late',
  'hoops', 'hoops-close', 'hoops-slow', 'hoops-late', 'hoops-mid',
] as const;

export type CaseClip = (typeof CASE_CLIPS)[number];

/** The clip's video and its poster frame. */
export function clipMedia(clip: CaseClip): { src: string; poster: string } {
  return { src: `/media/clips/${clip}.mp4`, poster: `/media/clips/${clip}.jpg` };
}

/** The source video a clip was cut from: 'hoops-slow' → 'hoops'. */
export function clipSource(clip: CaseClip): string {
  return clip.split('-')[0];
}

/** How the creator finished the clip: a caption style, a format, or a colour treatment. */
export type CaseLook = 'subtitle' | 'meme' | 'letterbox' | 'mono' | 'tag';
export const CASE_LOOKS: readonly CaseLook[] = ['subtitle', 'meme', 'letterbox', 'mono', 'tag'];

export type BrandCaseClip = { creator: string; platform: string; views: number; clip: CaseClip; caption: string; look: CaseLook; pending?: boolean };

export type BrandCase = {
  id: 'launch' | 'app' | 'music' | 'film' | 'tourism' | 'channel';
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
    label: '소비재 신제품',
    lead: '크리에이터들이 제품을 각자 스타일로 소개하는 숏폼을 찍어 올려요. 리뷰, 일상, 상황극처럼 저마다 다른 영상이 한 캠페인에 모여요.',
    kind: 'UGC 캠페인',
    title: '데일리 무드 편집숍 가을 신상 소개',
    brand: '데일리 무드',
    counts: { all: 128, pending: 6, approved: 122 },
    clips: [
      { creator: '민지', platform: 'instagram_reels', views: 82_000, clip: 'fashion-b', caption: '가을 토트백 OOTD', look: 'subtitle' },
      { creator: '서아', platform: 'tiktok', views: 124_000, clip: 'beauty', caption: '오늘의 메이크업 포인트', look: 'meme' },
      { creator: '도윤', platform: 'youtube_shorts', views: 31_000, clip: 'pet', caption: '#광고 #가을신상', look: 'tag' },
      { creator: '민지', platform: 'youtube_shorts', views: 29_000, clip: 'fashion-d', caption: '코트 입기 좋은 날', look: 'mono', pending: true },
    ],
  },
  {
    id: 'app',
    label: '앱·게임 출시',
    lead: '출시 영상과 플레이 장면을 크리에이터들이 각자 숏폼으로 편집해 올려요. 같은 영상이 플랫폼마다 다른 편집으로 퍼져요.',
    kind: '클리핑 캠페인',
    title: "모빌리티 앱 '무브' 론칭 필름 클리핑",
    brand: '무브 모빌리티',
    counts: { all: 74, pending: 3, approved: 71 },
    clips: [
      { creator: '편집왕', platform: 'youtube_shorts', views: 142_000, clip: 'car-a', caption: '론칭 필름 명장면', look: 'letterbox' },
      { creator: '클립데일리', platform: 'tiktok', views: 88_000, clip: 'car-b', caption: '실내 조명 봐', look: 'subtitle' },
      { creator: '숏츠랩', platform: 'instagram_reels', views: 51_000, clip: 'car-c', caption: '공유차 맞아?', look: 'meme', pending: true },
      { creator: '하이라이트', platform: 'kakao_shorts', views: 27_000, clip: 'car-d', caption: '#광고 #무브', look: 'tag' },
    ],
  },
  {
    id: 'music',
    label: '음원·아티스트',
    lead: '새 음원을 배경음으로 쓰거나 챌린지에 참여한 숏폼이 여러 플랫폼에 동시에 올라와요. 뮤직비디오와 무대 영상을 클리핑할 수도 있어요.',
    kind: '음악 캠페인',
    title: "신곡 '여름밤' 후렴 챌린지",
    brand: '데모 레코즈',
    counts: { all: 221, pending: 8, approved: 213 },
    clips: [
      { creator: '민지', platform: 'tiktok', views: 213_000, clip: 'fashion-c', caption: '여름밤 후렴 챌린지', look: 'subtitle' },
      { creator: '하루', platform: 'instagram_reels', views: 98_000, clip: 'sky', caption: '여름밤 × 하늘', look: 'letterbox' },
      { creator: '숏츠랩', platform: 'youtube_shorts', views: 55_000, clip: 'hoops-slow', caption: '후렴 타이밍', look: 'mono' },
      { creator: '서아', platform: 'kakao_shorts', views: 32_000, clip: 'beauty', caption: '#여름밤챌린지 #광고', look: 'tag', pending: true },
    ],
  },
  {
    id: 'film',
    label: '영화·공연·전시',
    lead: '개봉 전 예고편과 명장면, 공연 실황을 크리에이터들이 숏폼으로 편집해 올려요. 한 장면이 여러 편집으로 퍼져요.',
    kind: '클리핑 캠페인',
    title: '영화 〈사막의 추격〉 명장면 클리핑',
    brand: '오름 픽처스',
    counts: { all: 96, pending: 4, approved: 92 },
    clips: [
      { creator: '명장면', platform: 'youtube_shorts', views: 265_000, clip: 'drive', caption: '사막의 추격 · 2026', look: 'letterbox' },
      { creator: '편집왕', platform: 'tiktok', views: 131_000, clip: 'drive-close', caption: '이 장면 실화냐', look: 'meme' },
      { creator: '클립데일리', platform: 'instagram_reels', views: 76_000, clip: 'drive-slow', caption: '차가 날아간다', look: 'subtitle', pending: true },
      { creator: '하이라이트', platform: 'x', views: 44_000, clip: 'drive-late', caption: '결말은 극장에서', look: 'mono' },
    ],
  },
  {
    id: 'tourism',
    label: '지역·관광',
    lead: '여행 브이로그와 관광지 영상을 크리에이터들이 숏폼으로 편집해 올리거나, 직접 다녀온 영상을 올려요. 클리핑과 UGC 중 맞는 쪽으로 열 수 있어요.',
    kind: '클리핑 캠페인',
    // The sky clips are an overseas activity YouTuber's skydive, cut from his travel vlog.
    title: '여행 브이로그 스카이다이빙 편 클리핑',
    brand: '레오의 여행',
    counts: { all: 58, pending: 2, approved: 56 },
    clips: [
      { creator: '하루', platform: 'instagram_reels', views: 118_000, clip: 'sky', caption: '인생 첫 스카이다이빙', look: 'subtitle' },
      { creator: '숏츠랩', platform: 'youtube_shorts', views: 64_000, clip: 'sky-close', caption: '4,000m에서 뛰어내림', look: 'meme' },
      { creator: '명장면', platform: 'tiktok', views: 39_000, clip: 'sky-slow', caption: '여행 브이로그 · 다이빙 편', look: 'letterbox' },
      { creator: '클립데일리', platform: 'naver_clip', views: 21_000, clip: 'sky-late', caption: '#스카이다이빙 #광고', look: 'tag', pending: true },
    ],
  },
  {
    id: 'channel',
    label: '채널·방송',
    lead: '긴 영상과 방송의 명장면을 크리에이터들이 숏폼으로 편집해 올려요. 숏폼에서 원본 채널로 이어지는 길이 그만큼 많아져요.',
    kind: '클리핑 캠페인',
    title: '주말 농구 리그 하이라이트 클리핑',
    brand: '하루 스포츠',
    counts: { all: 39, pending: 2, approved: 37 },
    clips: [
      { creator: '편집왕', platform: 'youtube_shorts', views: 310_000, clip: 'hoops', caption: '주말 리그 하이라이트', look: 'subtitle' },
      { creator: '클립데일리', platform: 'tiktok', views: 186_000, clip: 'hoops-close', caption: '이 드리블 봐', look: 'mono' },
      { creator: '하이라이트', platform: 'x', views: 48_000, clip: 'hoops-late', caption: '버저비터 각?', look: 'meme' },
      { creator: '명장면', platform: 'instagram_reels', views: 93_000, clip: 'hoops-mid', caption: '3쿼터 명장면', look: 'letterbox', pending: true },
    ],
  },
];
