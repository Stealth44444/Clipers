import { REVIEW_SLA_OPTIONS } from '@clipers/db';
import { REVIEWED } from './common';
import { SOURCES } from './sources';
import type { Guide, GuideSection } from './types';

// One guide per platform a campaign can use. Platform facts come only from each platform's own help pages (SOURCES);
// where a platform has none we could check (X, Naver Clip), the guide says nothing about its rules. The view-check
// wording follows the company rule: YouTube is collected automatically, others are checked by the team on the video.

const UPDATED = '2026-10-02';
const REVIEW_CHOICES = REVIEW_SLA_OPTIONS.map((hours) => `${hours}시간`).join('이나 ');

const DISCLOSURE_RULE =
  '공정거래위원회 기준에 따라, 대가를 받고 올리는 영상에는 "광고", "유료광고", "협찬"처럼 경제적 이해관계를 제목이나 영상 시작처럼 잘 보이는 곳에 표시해야 해요. "AD"나 "체험단" 같은 표현은 알아보기 어려워 적절하지 않다고 안내돼 있어요.';

function clipersSection(automatic: boolean): GuideSection {
  return {
    heading: 'Clipers 캠페인에서는',
    paragraphs: [
      automatic
        ? '크리에이터가 영상 링크를 제출하면 조회수를 자동으로 가져와요. 검수를 통과한 영상의 검증된 조회수만큼만 예산이 쓰여요.'
        : '크리에이터가 영상 링크를 제출하면 운영팀이 영상에 표시된 조회수를 직접 확인해요. 검수를 통과한 영상의 검증된 조회수만큼만 예산이 쓰여요.',
      `캠페인을 만들 때 올릴 플랫폼을 고르고, 검수 시간은 ${REVIEW_CHOICES} 중에서 정해요. 광고 표시 문구도 요구사항에 함께 적을 수 있어요.`,
    ],
  };
}

function alongside(links: { label: string; href: string }[]): GuideSection {
  return {
    heading: '다른 플랫폼과 함께',
    paragraphs: ['한 캠페인에서 여러 플랫폼을 함께 고를 수 있어요. 같은 영상도 플랫폼마다 다른 크리에이터가 다른 버전으로 올려요.'],
    links,
  };
}

const LINK = {
  youtube: { label: '유튜브 쇼츠 마케팅', href: '/guides/youtube-shorts-marketing' },
  tiktok: { label: '틱톡 마케팅', href: '/guides/tiktok-marketing' },
  instagram: { label: '인스타그램 릴스 마케팅', href: '/guides/instagram-reels-marketing' },
  facebook: { label: '페이스북 릴스 마케팅', href: '/guides/facebook-reels-marketing' },
  x: { label: 'X 영상 마케팅', href: '/guides/x-video-marketing' },
  naver: { label: '네이버 클립 마케팅', href: '/guides/naver-clip-marketing' },
  kakao: { label: '카카오 숏폼 마케팅', href: '/guides/kakao-shortform-marketing' },
};

const COMMON = {
  audience: 'advertiser' as const,
  group: 'advertiser-platform' as const,
  faqIds: ['platforms', 'view-verification', 'creators'],
  counterpart: 'platforms',
  updated: UPDATED,
  reviewed: REVIEWED,
};

export const ADVERTISER_PLATFORM_GUIDES: Guide[] = [
  {
    ...COMMON,
    slug: 'youtube-shorts-marketing',
    title: '유튜브 쇼츠 마케팅은 어떻게 하나요?',
    description: '유튜브 쇼츠는 최대 3분 길이의 세로 영상이에요. 쇼츠로 브랜드를 알리는 방법, 유료 프로모션 표시, 클리핑 캠페인의 조회수 확인 방식을 정리했어요.',
    answer: [
      '유튜브 쇼츠는 최대 3분 길이의 세로·정사각형 영상이에요. 여러 크리에이터가 각자의 채널에 서로 다른 쇼츠를 올리게 하면, 광고 한 편을 송출할 때와 달리 여러 버전이 동시에 퍼져요.',
      'Clipers 캠페인에서는 쇼츠 조회수를 자동으로 가져오고, 검수를 통과한 영상의 검증된 조회수만큼만 예산이 쓰여요.',
    ],
    sections: [
      {
        heading: '쇼츠의 형식',
        paragraphs: [
          '유튜브는 2024년 10월 15일 이후 올라온 영상 중 세로나 정사각형 비율이고 길이가 3분 이내인 영상을 쇼츠로 분류해요. 그래서 신제품 소개, 방송 하이라이트, 게임 플레이 장면처럼 1~3분 안에 보여 줄 수 있는 내용이 잘 맞아요.',
        ],
      },
      {
        heading: '유료 프로모션 표시',
        paragraphs: [
          '유튜브에는 "동영상에 간접 광고, 스폰서십, 직접 광고와 같은 유료 프로모션이 포함되어 있음" 설정이 있어요. 켜면 영상이 시작될 때 10초 동안 시청자에게 공개 메시지가 표시돼요. 유튜브는 크리에이터와 브랜드 모두에게 현지 규정에 맞게 공개할 책임이 있다고 안내해요.',
          DISCLOSURE_RULE,
        ],
      },
      clipersSection(true),
      alongside([LINK.tiktok, LINK.instagram, LINK.naver]),
    ],
    related: ['tiktok-marketing', 'instagram-reels-marketing', 'naver-clip-marketing'],
    sources: [SOURCES.youtubeShorts, SOURCES.youtubePaidPromotion, SOURCES.adDisclosure],
  },
  {
    ...COMMON,
    slug: 'tiktok-marketing',
    title: '틱톡 마케팅은 어떻게 하나요?',
    description: '틱톡에서 브랜드를 알리려면 여러 크리에이터의 숏폼이 필요해요. 틱톡의 상업 콘텐츠 공개 설정과 클리핑 캠페인으로 틱톡 영상을 모으는 방법을 정리했어요.',
    answer: [
      '틱톡에서는 브랜드 계정 하나보다 여러 크리에이터가 각자 올린 영상이 더 많은 사람에게 닿을 수 있어요. 클리핑 캠페인을 열면 승인된 크리에이터들이 틱톡에 영상을 올리고, 검증된 조회수만큼만 예산이 쓰여요.',
      '틱톡은 브랜드를 홍보하는 영상에 상업 콘텐츠 공개 설정을 켜도록 하고 있어요.',
    ],
    sections: [
      {
        heading: '틱톡 캠페인을 여는 방법',
        paragraphs: [
          '캠페인을 만들 때 올릴 플랫폼으로 틱톡을 고르고, 정해진 영상을 편집하는 클리핑 캠페인이나 제품을 직접 소개하는 소개 캠페인 중에서 정해요. 크리에이터마다 편집 방식이 달라서 같은 영상도 여러 버전으로 올라와요.',
        ],
      },
      {
        heading: '상업 콘텐츠 공개 설정',
        paragraphs: [
          '틱톡은 브랜드나 제품, 서비스를 홍보하는 영상을 올릴 때 "Disclose commercial content" 설정을 켜야 한다고 안내해요. 다른 회사의 브랜드를 홍보하는 영상에는 "Paid partnership" 표시가 붙고, 공개하지 않은 게시물은 삭제되거나 노출이 제한될 수 있어요.',
          DISCLOSURE_RULE,
        ],
      },
      clipersSection(false),
      alongside([LINK.youtube, LINK.instagram, LINK.x]),
    ],
    related: ['youtube-shorts-marketing', 'instagram-reels-marketing', 'x-video-marketing'],
    sources: [SOURCES.tiktokDisclosure, SOURCES.adDisclosure],
  },
  {
    ...COMMON,
    slug: 'instagram-reels-marketing',
    title: '인스타그램 릴스 마케팅은 어떻게 하나요?',
    description: '인스타그램 릴스로 브랜드를 알리는 방법을 정리했어요. 메타의 협찬 광고 레이블, 광고 표시 기준, 클리핑 캠페인에서 릴스 조회수를 확인하는 방식까지 담았어요.',
    answer: [
      '인스타그램 릴스는 크리에이터의 계정에서 팔로워와 추천 화면으로 퍼지는 세로 영상이에요. 클리핑 캠페인을 열면 여러 크리에이터가 각자의 릴스를 올리고, 검증된 조회수만큼만 예산이 쓰여요.',
      '대가를 받고 올리는 릴스에는 광고 표시가 필요하고, 메타에는 협찬 광고 레이블 기능이 있어요.',
    ],
    sections: [
      {
        heading: '릴스 캠페인을 고를 때',
        paragraphs: [
          '패션, 뷰티, 음식, 여행처럼 장면이 중요한 제품이라면 릴스를 함께 고르는 걸 검토해 보세요. 캠페인을 만들 때 인스타그램 릴스를 고르고, 참고 영상과 꼭 보여 줄 장면을 요구사항에 적어 두면 크리에이터가 그에 맞춰 만들어요.',
        ],
      },
      {
        heading: '협찬 광고 레이블과 광고 표시',
        paragraphs: [
          '메타는 인스타그램과 페이스북 게시물에 협찬 관계를 알리는 레이블 기능을 두고 있어요. 레이블과 별개로, 영상 안이나 설명 첫 부분에도 광고임을 알 수 있게 적어 두는 게 안전해요.',
          DISCLOSURE_RULE,
        ],
      },
      clipersSection(false),
      alongside([LINK.facebook, LINK.youtube, LINK.tiktok]),
    ],
    related: ['facebook-reels-marketing', 'youtube-shorts-marketing', 'tiktok-marketing'],
    sources: [SOURCES.metaPaidPartnership, SOURCES.adDisclosure],
  },
  {
    ...COMMON,
    slug: 'facebook-reels-marketing',
    title: '페이스북 릴스 마케팅은 어떻게 하나요?',
    description: '페이스북 릴스로 브랜드를 알리는 방법이에요. 인스타그램 릴스와 함께 운영하는 법, 메타의 협찬 광고 레이블, 클리핑 캠페인의 조회수 확인 방식을 정리했어요.',
    answer: [
      '페이스북 릴스는 인스타그램 릴스와 같은 세로 영상 형식이라, 한 캠페인에서 두 플랫폼을 함께 고를 수 있어요.',
      'Clipers 캠페인에서는 운영팀이 영상에 표시된 조회수를 직접 확인하고, 검수를 통과한 영상의 검증된 조회수만큼만 예산이 쓰여요.',
    ],
    sections: [
      {
        heading: '인스타그램과 함께 고르기',
        paragraphs: [
          '두 플랫폼 모두 메타가 운영해서 영상 형식이 비슷해요. 캠페인을 만들 때 둘을 함께 고르면, 크리에이터가 자기 계정이 있는 쪽에 올려요.',
        ],
      },
      {
        heading: '협찬 광고 레이블과 광고 표시',
        paragraphs: [
          '메타는 페이스북 게시물에도 협찬 관계를 알리는 레이블 기능을 두고 있어요. 레이블과 별개로 영상 안이나 설명 첫 부분에도 광고임을 알 수 있게 적어 두는 게 안전해요.',
          DISCLOSURE_RULE,
        ],
      },
      clipersSection(false),
      alongside([LINK.instagram, LINK.youtube, LINK.kakao]),
    ],
    related: ['instagram-reels-marketing', 'youtube-shorts-marketing', 'kakao-shortform-marketing'],
    sources: [SOURCES.metaPaidPartnership, SOURCES.adDisclosure],
  },
  {
    ...COMMON,
    slug: 'x-video-marketing',
    title: 'X(트위터) 영상 마케팅은 어떻게 하나요?',
    description: 'X(트위터)에 올라가는 짧은 영상으로 브랜드를 알리는 방법이에요. 게임·방송·아이돌처럼 실시간 반응이 많은 분야에서 클리핑 캠페인을 쓰는 법을 정리했어요.',
    answer: [
      'X에서는 게임, 방송, 아이돌, 스포츠처럼 실시간으로 이야기가 오가는 분야의 짧은 영상이 함께 공유돼요.',
      '클리핑 캠페인에서 X를 고르면 크리에이터가 하이라이트를 짧게 잘라 올리고, 운영팀이 영상에 표시된 조회수를 직접 확인해 검증된 조회수만큼만 예산이 쓰여요.',
    ],
    sections: [
      {
        heading: '어떤 캠페인에 맞나요',
        paragraphs: [
          '방송 직후의 명장면, 게임 업데이트의 한 장면, 경기 하이라이트처럼 바로 이야기가 되는 장면을 퍼뜨릴 때 X를 함께 고르는 걸 검토해 보세요. 업종별 가이드에서 방송·게임·스포츠 사례를 함께 보세요.',
        ],
        links: [
          { label: '예능·드라마 클립을 숏폼으로 더 퍼뜨리려면', href: '/guides/for-broadcasters' },
          { label: '게임 출시와 업데이트를 숏폼으로 알리려면', href: '/guides/for-games' },
        ],
      },
      {
        heading: '광고 표시',
        paragraphs: [DISCLOSURE_RULE, '짧은 글과 함께 올라가는 영상이라, 글의 첫 부분에 광고 표시를 두도록 요구사항에 적어 두세요.'],
      },
      clipersSection(false),
      alongside([LINK.tiktok, LINK.youtube, LINK.naver]),
    ],
    related: ['tiktok-marketing', 'youtube-shorts-marketing', 'for-games'],
    sources: [SOURCES.adDisclosure],
  },
  {
    ...COMMON,
    slug: 'naver-clip-marketing',
    title: '네이버 클립 마케팅은 어떻게 하나요?',
    description: '네이버 클립으로 브랜드를 알리는 방법이에요. 국내 이용자가 많은 네이버에서 숏폼 캠페인을 여는 법, 광고 표시 기준, 클리핑 캠페인의 조회수 확인 방식을 정리했어요.',
    answer: [
      '네이버 클립은 네이버가 운영하는 숏폼 서비스예요. 국내 이용자를 겨냥한 캠페인이라면 유튜브 쇼츠나 릴스와 함께 고르는 것을 검토해 볼 만해요.',
      'Clipers 캠페인에서는 운영팀이 영상에 표시된 조회수를 직접 확인하고, 검수를 통과한 영상의 검증된 조회수만큼만 예산이 쓰여요.',
    ],
    sections: [
      {
        heading: '네이버 클립을 고를 때',
        paragraphs: [
          '지역 매장, 관광지, 생활용품처럼 국내 소비자에게 바로 닿아야 하는 캠페인이라면 함께 고르는 걸 검토해 보세요. 업종별 가이드에서 지역·관광 사례를 함께 보세요.',
        ],
        links: [{ label: '지역과 관광지를 숏폼으로 알리려면', href: '/guides/for-local-tourism' }],
      },
      {
        heading: '광고 표시',
        paragraphs: [DISCLOSURE_RULE],
      },
      clipersSection(false),
      alongside([LINK.youtube, LINK.instagram, LINK.kakao]),
    ],
    related: ['youtube-shorts-marketing', 'kakao-shortform-marketing', 'for-local-tourism'],
    sources: [SOURCES.adDisclosure],
  },
  {
    ...COMMON,
    slug: 'kakao-shortform-marketing',
    title: '카카오 숏폼 마케팅은 어떻게 하나요?',
    description: '카카오톡 숏폼으로 브랜드를 알리는 방법이에요. 카카오의 숏폼 창작자 모집 소식, 광고 표시 기준, 클리핑 캠페인에서 카카오 숏폼 조회수를 확인하는 방식을 정리했어요.',
    answer: [
      '카카오는 카카오톡 안의 숏폼을 키우고 있고, 2026년 1월에는 "카톡 숏폼 챌린지"로 숏폼 창작자를 모집했어요.',
      '클리핑 캠페인에서 카카오 숏폼을 고르면 운영팀이 영상에 표시된 조회수를 직접 확인하고, 검증된 조회수만큼만 예산이 쓰여요.',
    ],
    sections: [
      {
        heading: '카카오 숏폼의 지금',
        paragraphs: [
          '카카오는 2026년 1월 5일, 콘텐츠 제작에 관심 있는 이용자라면 누구나 지원할 수 있는 "카톡 숏폼 챌린지"를 열고 100일 동안 단계별 미션과 교육, 리워드를 주는 프로그램을 안내했어요. 카카오톡 채널을 가진 사업자도 참여할 수 있다고 밝혔어요.',
        ],
      },
      {
        heading: '광고 표시',
        paragraphs: [DISCLOSURE_RULE],
      },
      clipersSection(false),
      alongside([LINK.naver, LINK.youtube, LINK.instagram]),
    ],
    related: ['naver-clip-marketing', 'youtube-shorts-marketing', 'instagram-reels-marketing'],
    sources: [SOURCES.kakaoShortformChallenge, SOURCES.adDisclosure],
  },
];
