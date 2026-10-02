import { PLATFORMS, REVIEW_SLA_OPTIONS } from '@clipers/db';
import { REVIEWED } from './common';
import { MIN_BUDGET } from './facts';
import { SOURCES } from './sources';
import type { Guide, GuideSource } from './types';

// Comparison guides. By method (no names) and by name. Named comparisons only repeat what each service states on its
// own pages, checked on the date in `sources`, and stay `legalReviewed: false` until a lawyer has read them. Never a
// judgment (cheaper, slower, better): differences are structural — how cost arises, who picks creators, how results
// are measured — and the closing section says which purpose each one fits.

const UPDATED = '2026-10-02';
const checked = '2026-10-02';
const REVIEW_CHOICES = REVIEW_SLA_OPTIONS.map((hours) => `${hours}시간`).join('이나 ');
const PLATFORM_LIST = PLATFORMS.map((platform) => (platform.value === 'instagram_reels' ? '인스타그램 릴스' : platform.label)).join(', ');

/** What Clipers is, in the same words on every comparison. */
const CLIPERS_SECTION = {
  heading: 'Clipers는 이렇게 돌아가요',
  paragraphs: [
    `광고주가 ${MIN_BUDGET}(부가세 별도)부터 캠페인을 열면 크리에이터가 지원하고, 운영팀이 승인한 크리에이터가 숏폼을 올려요. 검수 시간은 ${REVIEW_CHOICES} 중에서 정하고, 검수를 통과한 영상의 검증된 조회수만큼만 예산이 쓰여요.`,
    `올릴 수 있는 플랫폼은 ${PLATFORM_LIST}예요. 영상 하나와 크리에이터 한 명이 받을 수 있는 금액에 상한이 있어 예산이 여러 영상에 나뉘고, 크리에이터 정산과 지급은 Clipers가 원화로 맡아요.`,
  ],
};

const COMMON = {
  audience: 'advertiser' as const,
  group: 'compare' as const,
  updated: UPDATED,
  reviewed: REVIEWED,
};

const NAMED = { ...COMMON, faqIds: ['cost', 'creators', 'view-verification'], legalReviewed: false };

const revuSources: GuideSource[] = [
  { label: '레뷰 비즈 — 지역·매장 체험단 진행 과정', url: 'https://biz.revu.net/local/process', checked },
  { label: '레뷰 비즈 — 제품 블로그 체험단', url: 'https://biz.revu.net/product/products/blog?prod=blog', checked },
];
const featuringSources: GuideSource[] = [
  { label: '피처링 — 요금제', url: 'https://www.featuring.co/pricing', checked },
  { label: '피처링 — 홈', url: 'https://www.featuring.co', checked },
];
const reviewnoteSources: GuideSource[] = [{ label: '리뷰노트 — 홈', url: 'https://www.reviewnote.co.kr', checked }];
const gangnamSources: GuideSource[] = [{ label: '강남맛집 체험단 — 광고주 안내', url: 'https://xn--939au0g4vj8sq.net/business', checked }];
const whopSources: GuideSource[] = [
  { label: 'Whop Docs — Content Rewards', url: 'https://docs.whop.com/memberships-and-access/third-party-apps/content-rewards', checked },
];
const vyroSources: GuideSource[] = [{ label: 'Vyro — 홈', url: 'https://vyro.com', checked }];

export const COMPARE_GUIDES: Guide[] = [
  {
    ...COMMON,
    slug: 'clipers-vs-influencer-marketing',
    title: '인플루언서 마케팅과 클리핑 캠페인, 무엇이 다른가요?',
    description: '인플루언서 섭외와 클리핑 캠페인은 비용이 생기는 시점, 참여하는 방식, 결과물의 수가 달라요. 목적에 따라 무엇을 고르면 좋은지 정리했어요.',
    answer: [
      '인플루언서 마케팅은 정한 인플루언서에게 게시물 단위로 비용을 내고, 클리핑 캠페인은 여러 크리에이터가 올린 영상의 검증된 조회수만큼만 비용을 내요.',
      '한 사람의 영향력을 빌릴지, 여러 사람의 다양한 버전으로 넓게 퍼뜨릴지에 따라 고르면 돼요.',
    ],
    sections: [
      {
        heading: '비용이 생기는 시점',
        paragraphs: [
          '인플루언서 섭외는 보통 게시물을 올리기로 약속할 때 비용이 정해져요. 클리핑 캠페인은 영상이 검수를 통과하고 조회수가 확인된 만큼만 예산이 쓰여요. 조회수가 나오지 않은 영상에는 예산이 쓰이지 않아요.',
        ],
      },
      {
        heading: '참여하는 방식과 결과물',
        paragraphs: [
          '인플루언서 마케팅은 광고주나 대행사가 사람을 골라 섭외해요. 클리핑 캠페인은 캠페인을 열어 두면 크리에이터가 지원하고, 운영팀이 승인한 사람들이 각자 다른 버전의 영상을 올려요. 한 편 대신 여러 편이 쌓여요.',
        ],
      },
      {
        heading: '광고 표시는 똑같이',
        paragraphs: [
          '어느 방식이든 대가를 받고 올리는 게시물에는 "광고", "유료광고", "협찬"처럼 경제적 이해관계를 잘 보이는 곳에 표시해야 해요(공정거래위원회 추천·보증 심사지침).',
        ],
      },
      CLIPERS_SECTION,
      {
        heading: '이럴 때 맞아요',
        paragraphs: [
          '특정 인물의 신뢰나 이미지를 빌려야 하는 출시라면 인플루언서 섭외가 맞아요. 이미 있는 영상이나 제품을 여러 계정에서 많이 보이게 하고, 조회수만큼만 비용을 쓰고 싶다면 클리핑 캠페인이 맞아요. 둘을 함께 쓰는 경우도 있어요.',
        ],
        links: [{ label: '인플루언서 섭외 없이 숏폼 바이럴을 할 수 있나요?', href: '/guides/viral-without-influencers' }],
      },
    ],
    faqIds: ['cost', 'creators', 'clip-cap'],
    related: ['viral-without-influencers', 'clipers-vs-review-campaigns', 'clipers-vs-short-form-ads'],
    sources: [SOURCES.adDisclosure],
  },
  {
    ...COMMON,
    slug: 'clipers-vs-review-campaigns',
    title: '체험단과 숏폼 클리핑 캠페인, 무엇이 다른가요?',
    description: '체험단은 제품이나 이용권을 주고 후기를 받고, 클리핑 캠페인은 숏폼의 검증된 조회수만큼 비용을 내요. 보상, 채널, 목표의 차이와 함께 쓰는 방법을 정리했어요.',
    answer: [
      '체험단은 제품·식사·이용권 같은 혜택을 주고 블로그나 SNS 후기를 받는 방식이고, 클리핑 캠페인은 숏폼 영상의 검증된 조회수만큼 비용을 내는 방식이에요.',
      '검색했을 때 보이는 후기가 필요하면 체험단, 숏폼으로 넓게 보이는 게 필요하면 클리핑 캠페인이 맞아요.',
    ],
    sections: [
      {
        heading: '보상이 다르다',
        paragraphs: ['체험단 참여자는 제품이나 서비스를 체험하는 혜택을 받아요. 클리핑 캠페인의 크리에이터는 올린 영상의 검증된 조회수만큼 정산받아요.'],
      },
      {
        heading: '채널과 목표가 다르다',
        paragraphs: [
          '체험단은 블로그 후기처럼 검색 결과에 남는 글이 중심이에요. 클리핑 캠페인은 쇼츠·릴스·틱톡 같은 숏폼 피드에서 보이는 영상이 중심이에요. 매장 방문 후기가 필요한지, 영상 노출이 필요한지에 따라 달라져요.',
        ],
      },
      {
        heading: '광고 표시',
        paragraphs: [
          '공정거래위원회는 대가를 받은 후기에 "광고", "협찬"처럼 알아보기 쉬운 표현을 쓰라고 안내하고, "체험단"이라는 표현만으로는 경제적 이해관계를 알리기 어렵다고 봐요.',
        ],
      },
      CLIPERS_SECTION,
      {
        heading: '함께 쓰는 법',
        paragraphs: [
          '매장이나 제품의 검색 후기는 체험단으로 쌓고, 같은 시기에 숏폼 캠페인으로 영상 노출을 더하는 식으로 함께 쓸 수 있어요. 지역 매장이라면 지역·관광 가이드도 참고하세요.',
        ],
        links: [{ label: '지역과 관광지를 숏폼으로 알리려면', href: '/guides/for-local-tourism' }],
      },
    ],
    faqIds: ['cost', 'creators', 'platforms'],
    related: ['clipers-vs-influencer-marketing', 'clipers-vs-reviewnote', 'clipers-vs-gangnam-matzip'],
    sources: [SOURCES.adDisclosure],
  },
  {
    ...COMMON,
    slug: 'clipers-vs-short-form-ads',
    title: '숏폼 유료 광고와 클리핑 캠페인, 무엇이 다른가요?',
    description: '쇼츠·릴스 유료 광고는 노출을 사고, 클리핑 캠페인은 크리에이터의 게시물이 만든 검증된 조회수만큼 비용을 내요. 두 방식의 차이와 함께 쓰는 법을 정리했어요.',
    answer: [
      '숏폼 유료 광고는 플랫폼에 비용을 내고 광고 영상을 노출하는 방식이고, 클리핑 캠페인은 크리에이터가 자기 계정에 올린 영상의 검증된 조회수만큼 비용을 내는 방식이에요.',
      '광고는 노출 대상과 기간을 정밀하게 정할 수 있고, 클리핑 캠페인은 여러 크리에이터의 다른 버전이 일반 게시물로 쌓여요.',
    ],
    sections: [
      {
        heading: '누가 올리나',
        paragraphs: ['유료 광고는 브랜드 계정이 만든 광고가 광고 자리에 노출돼요. 클리핑 캠페인은 크리에이터가 자기 계정에 올린 게시물이라 그 계정의 팔로워와 추천 피드로 퍼져요.'],
      },
      {
        heading: '무엇에 비용을 내나',
        paragraphs: ['유료 광고는 플랫폼의 노출이나 클릭에 비용을 내요. 클리핑 캠페인은 검수를 통과한 영상의 검증된 조회수만큼 예산이 쓰이고, 영상 하나에 쓰일 수 있는 금액에 상한을 둘 수 있어요.'],
      },
      {
        heading: '광고 표시',
        paragraphs: [
          '크리에이터 게시물도 대가를 받았다면 광고 표시가 필요해요. 유튜브에는 유료 프로모션 포함 설정이 있고, 켜면 영상 시작 10초 동안 공개 메시지가 보여요.',
        ],
      },
      CLIPERS_SECTION,
      {
        heading: '함께 쓰는 법',
        paragraphs: ['클리핑 캠페인으로 여러 버전을 올려 반응이 좋은 장면을 찾고, 그 장면으로 광고 소재를 만드는 식으로 함께 쓸 수 있어요. 2차 활용은 크리에이터의 동의가 필요한지 캠페인 조건에서 확인하세요.'],
      },
    ],
    faqIds: ['cost', 'clip-cap', 'platforms'],
    related: ['clipers-vs-influencer-marketing', 'pay-per-view', 'youtube-shorts-marketing'],
    sources: [SOURCES.youtubePaidPromotion, SOURCES.adDisclosure],
  },
  {
    ...NAMED,
    slug: 'clipers-vs-revu',
    title: '레뷰와 Clipers, 무엇이 다른가요?',
    description: '레뷰는 체험단·인플루언서 마케팅 서비스이고, Clipers는 숏폼의 검증된 조회수만큼 비용을 내는 클리핑 캠페인 플랫폼이에요. 각 서비스가 밝힌 내용으로 비교했어요.',
    answer: [
      '레뷰는 체험단과 인플루언서 마케팅을 진행하는 서비스로, 매장에 맞는 인플루언서를 레뷰가 직접 선정한다고 밝히고 있어요.',
      'Clipers는 캠페인을 열면 크리에이터가 지원하고, 운영팀이 승인한 크리에이터의 숏폼이 만든 검증된 조회수만큼만 예산이 쓰여요.',
    ],
    sections: [
      {
        heading: '진행 방식',
        paragraphs: ['레뷰는 지역·매장 체험단을 상권 진단부터 보고서 제공까지 단계별로 진행한다고 안내해요. Clipers는 광고주가 캠페인 조건을 정해 열고, 승인된 크리에이터들이 영상을 올리면 운영팀이 검수해요.'],
      },
      {
        heading: '비용이 생기는 방식',
        paragraphs: ['레뷰의 광고주 페이지에는 공개 가격이 없어요. Clipers는 검수를 통과한 영상의 검증된 조회수만큼 예산이 쓰이는 구조예요.'],
      },
      CLIPERS_SECTION,
      {
        heading: '이럴 때 맞아요',
        paragraphs: ['블로그·플레이스 후기와 방문 체험을 컨설턴트와 함께 운영하고 싶다면 레뷰 같은 체험단 서비스가 맞아요. 숏폼 영상을 여러 계정에서 많이 보이게 하고 조회수만큼만 비용을 쓰고 싶다면 Clipers가 맞아요.'],
      },
    ],
    claims: [
      { subject: '레뷰', text: '대한민국 대표 체험단, 인플루언서 마케팅 서비스라고 소개해요.', source: 0 },
      { subject: '진행 과정', text: '상권 진단 → 상품 설계 → 전담 컨설턴트 운영 → 방문 일정 조율 → 콘텐츠 검수 → 보고서 제공 (지역·매장 체험단)', source: 0 },
      { subject: '인플루언서 선정', text: '지역, 업종, 콘텐츠 톤, 방문 가능 일정, 활동 지표를 확인해 매장에 맞는 인플루언서를 레뷰가 직접 선정한다고 밝혀요.', source: 0 },
      { subject: '채널', text: '블로그, 네이버 플레이스, 인스타그램, 숏폼, 유튜브 체험단을 안내해요.', source: 0 },
      { subject: '결과 보고', text: '콘텐츠 URL, 리뷰 상태, 키워드 노출, 플레이스 반응을 정리한 성과 리포트를 준다고 밝혀요.', source: 0 },
      { subject: '제품 블로그 체험단', text: 'AI가 분석해 광고에 적합한 블로그를 점수로 보여 준다고 안내해요.', source: 1 },
    ],
    related: ['clipers-vs-review-campaigns', 'clipers-vs-featuring', 'clipers-vs-influencer-marketing'],
    sources: revuSources,
  },
  {
    ...NAMED,
    slug: 'clipers-vs-featuring',
    title: '피처링과 Clipers, 무엇이 다른가요?',
    description: '피처링은 광고주가 인플루언서를 찾고 관리하는 구독형 도구이고, Clipers는 숏폼의 검증된 조회수만큼 비용을 내는 캠페인 플랫폼이에요. 공개된 내용으로 비교했어요.',
    answer: [
      '피처링은 광고주가 조건을 넣어 인플루언서를 검색하고 캠페인을 관리하는 올인원 인플루언서 마케팅 플랫폼으로, 월 구독 요금제를 공개하고 있어요.',
      'Clipers는 도구를 구독하는 대신 캠페인 예산을 넣고, 검수를 통과한 숏폼의 검증된 조회수만큼만 예산이 쓰여요.',
    ],
    sections: [
      {
        heading: '누가 크리에이터를 고르나',
        paragraphs: ['피처링은 광고주가 플랫폼, 카테고리, 팔로워 수 같은 조건으로 인플루언서를 찾아 직접 고르는 방식이에요. Clipers는 캠페인을 열면 크리에이터가 지원하고 운영팀이 승인해요.'],
      },
      {
        heading: '비용이 생기는 방식',
        paragraphs: ['피처링은 요금제 페이지에 월 구독 요금을 공개하고 있고, 인플루언서에게 주는 비용은 따로예요. Clipers는 구독료 없이 캠페인 예산 안에서 검증된 조회수만큼 쓰여요.'],
      },
      CLIPERS_SECTION,
      {
        heading: '이럴 때 맞아요',
        paragraphs: ['인플루언서를 직접 찾고 계약·관리를 내부에서 하고 싶다면 피처링 같은 도구가 맞아요. 섭외 없이 여러 크리에이터의 숏폼을 모으고 정산까지 맡기고 싶다면 Clipers가 맞아요.'],
      },
    ],
    claims: [
      { subject: '피처링', text: 'All-In-One 인플루언서 마케팅 플랫폼으로, 인플루언서 검색부터 관리, 캠페인 성과 분석까지 제공한다고 소개해요.', source: 1 },
      { subject: '요금', text: '스탠다드 월 420,000원, 프리미엄 월 837,000원, 엔터프라이즈는 별도 문의로 안내해요(연간 결제 요금도 따로 표시).', source: 0 },
      { subject: '인플루언서 선정', text: '플랫폼, 카테고리, 팔로워 수 등 원하는 조건을 입력해 광고주가 인플루언서를 찾는 방식이에요.', source: 1 },
      { subject: '지원 플랫폼', text: '인스타그램, 유튜브, 틱톡, 엑스, 네이버 블로그 5개를 지원한다고 밝혀요.', source: 0 },
      { subject: '성과 리포트', text: '참여율(ER), CPR, CPE 등 캠페인 주요 지표를 요약한 결과 리포트를 제공한다고 밝혀요.', source: 0 },
    ],
    related: ['clipers-vs-revu', 'clipers-vs-influencer-marketing', 'viral-without-influencers'],
    sources: featuringSources,
  },
  {
    ...NAMED,
    slug: 'clipers-vs-reviewnote',
    title: '리뷰노트와 Clipers, 무엇이 다른가요?',
    description: '리뷰노트는 리뷰어가 체험 혜택을 받고 후기를 남기는 체험단 서비스이고, Clipers는 숏폼의 검증된 조회수만큼 비용을 내는 플랫폼이에요. 공개된 내용으로 비교했어요.',
    answer: [
      '리뷰노트는 캠페인마다 모집 기간과 제공 혜택을 공개하고 리뷰어가 신청하는 체험단 서비스예요.',
      'Clipers는 혜택 대신 검증된 조회수만큼 크리에이터에게 정산하는 숏폼 캠페인 플랫폼이에요.',
    ],
    sections: [
      {
        heading: '보상이 다르다',
        paragraphs: ['리뷰노트의 캠페인은 제품, 식사권, 이용권, 포인트 같은 혜택을 내걸어요. Clipers의 크리에이터는 올린 영상의 검증된 조회수만큼 정산받아요.'],
      },
      {
        heading: '결과물이 다르다',
        paragraphs: ['리뷰노트는 블로그, 릴스, 유튜브 등의 후기를 모아요. Clipers는 쇼츠·릴스·틱톡 같은 숏폼 영상을 모으고, 조회수를 기준으로 예산이 쓰여요.'],
      },
      CLIPERS_SECTION,
      {
        heading: '이럴 때 맞아요',
        paragraphs: ['매장 방문 후기나 제품 사용 후기를 검색에 쌓고 싶다면 리뷰노트 같은 체험단이 맞아요. 숏폼 노출을 조회수만큼만 사고 싶다면 Clipers가 맞아요.'],
        links: [{ label: '체험단과 숏폼 클리핑 캠페인, 무엇이 다른가요?', href: '/guides/clipers-vs-review-campaigns' }],
      },
    ],
    claims: [
      { subject: '리뷰노트', text: '"대한민국 체험단 수 1위, 신뢰받는 리뷰"라고 소개해요(자체 표현).', source: 0 },
      { subject: '캠페인 정보', text: '캠페인마다 모집 기간, 신청자 수, 제공 혜택(제품·이용권·포인트 등)을 공개해요.', source: 0 },
      { subject: '채널', text: '블로그, 릴스, 유튜브 등의 캠페인을 보여 줘요.', source: 0 },
      { subject: '광고주 비용', text: '홈페이지에 광고주 비용 안내는 공개돼 있지 않아요.', source: 0 },
    ],
    related: ['clipers-vs-review-campaigns', 'clipers-vs-gangnam-matzip', 'clipers-vs-revu'],
    sources: reviewnoteSources,
  },
  {
    ...NAMED,
    slug: 'clipers-vs-gangnam-matzip',
    title: '강남맛집 체험단과 Clipers, 무엇이 다른가요?',
    description: '강남맛집 체험단은 업종과 지역에 맞는 리뷰어를 골라 블로그 후기를 쌓는 서비스이고, Clipers는 숏폼의 검증된 조회수만큼 비용을 내요. 공개된 내용으로 비교했어요.',
    answer: [
      '강남맛집 체험단은 블로그 배송형·방문형·기자단 체험단을 운영하며, 업종과 지역에 맞는 리뷰어를 선별한다고 밝히고 있어요.',
      'Clipers는 숏폼 영상을 모으고, 검수를 통과한 영상의 검증된 조회수만큼만 예산이 쓰여요.',
    ],
    sections: [
      {
        heading: '결과물이 다르다',
        paragraphs: ['강남맛집 체험단은 블로그 후기와 키워드 노출을 중심으로 보고서를 줘요. Clipers는 숏폼 영상의 조회수를 기준으로 예산이 쓰이고, 남은 예산을 실시간으로 볼 수 있어요.'],
      },
      {
        heading: '누가 고르나',
        paragraphs: ['강남맛집 체험단은 리뷰어를 선별하고 전문 상담원이 방법을 제안한다고 안내해요. Clipers는 크리에이터가 지원하고 운영팀이 승인해요.'],
      },
      CLIPERS_SECTION,
      {
        heading: '이럴 때 맞아요',
        paragraphs: ['맛집·매장의 블로그 후기와 검색 노출이 목표라면 강남맛집 같은 체험단이 맞아요. 숏폼으로 매장이나 지역을 넓게 보이게 하고 싶다면 Clipers가 맞아요.'],
        links: [{ label: '지역과 관광지를 숏폼으로 알리려면', href: '/guides/for-local-tourism' }],
      },
    ],
    claims: [
      { subject: '강남맛집 체험단', text: '"전략적인 광고, 효과적인 결과"를 내건 리뷰 기반 마케팅 플랫폼으로 소개해요.', source: 0 },
      { subject: '상품', text: '블로그 배송형, 블로그 방문형, 블로그 기자단을 안내해요.', source: 0 },
      { subject: '리뷰어 선정', text: '업종과 지역에 맞는 리뷰어를 선별하고, 광고주 요구에 맞춰 전문 상담원이 방법을 제안한다고 밝혀요.', source: 0 },
      { subject: '결과 보고', text: '리뷰 노출 현황, 유입 키워드 분석, 마케팅 성과를 담은 보고서를 준다고 밝혀요.', source: 0 },
      { subject: '규모', text: '누적 리뷰어, 광고주, 캠페인, 리뷰 수를 광고주 페이지에 공개해요.', source: 0 },
      { subject: '광고주 비용', text: '광고주 페이지에 공개 가격은 없어요.', source: 0 },
    ],
    related: ['clipers-vs-reviewnote', 'clipers-vs-review-campaigns', 'for-local-tourism'],
    sources: gangnamSources,
  },
  {
    ...NAMED,
    slug: 'clipers-vs-whop',
    title: 'Whop Content Rewards와 Clipers, 무엇이 다른가요?',
    description: 'Whop Content Rewards와 Clipers는 둘 다 조회수만큼 지급하는 클리핑 방식이에요. 누가 승인하는지, 어떤 플랫폼과 언어·통화로 운영되는지 공개된 내용으로 비교했어요.',
    answer: [
      'Whop Content Rewards는 캠페인 주인이 1,000회당 금액과 예산을 정하고 제출물을 직접 승인하면, Whop이 조회수만큼 크리에이터에게 지급하는 해외 서비스예요.',
      'Clipers는 같은 조회수 기반 방식을 국내 광고주와 크리에이터에 맞춰 한국어와 원화로 운영하고, 승인과 검수를 운영팀이 맡아요.',
    ],
    sections: [
      {
        heading: '누가 승인하나',
        paragraphs: ['Whop 문서에 따르면 캠페인 주인이 제출물을 보고 요구사항을 지켰는지 판단해 승인하거나 반려해요. Clipers는 운영팀이 크리에이터 지원과 영상 검수를 맡고, 반려할 때는 사유를 알려요.'],
      },
      {
        heading: '플랫폼과 운영 언어',
        paragraphs: ['Whop의 클리핑 캠페인은 틱톡, 유튜브 쇼츠, X, 인스타그램 릴스를 안내해요. Clipers는 여기에 페이스북, 네이버 클립, 카카오 숏폼까지 국내 플랫폼을 함께 지원하고, 한국어로 운영해요.'],
      },
      CLIPERS_SECTION,
      {
        heading: '이럴 때 맞아요',
        paragraphs: ['해외 크리에이터와 영어권 시청자를 겨냥한다면 Whop 같은 해외 서비스가 맞아요. 국내 시청자와 국내 플랫폼, 한국어 크리에이터가 필요하다면 Clipers가 맞아요.'],
        links: [{ label: '클리핑 마케팅이란 뭔가요?', href: '/guides/clipping-marketing' }],
      },
    ],
    claims: [
      { subject: 'Whop Content Rewards', text: '브랜드와 콘텐츠 크리에이터를 연결하는 마케팅 도구로, 크리에이터가 받은 조회수만큼 지급한다고 설명해요.', source: 0 },
      { subject: '비용 설정', text: '캠페인 주인이 1,000회당 금액, 캠페인 총예산, 영상 하나당 최대 지급액을 정해요.', source: 0 },
      { subject: '승인', text: '캠페인 주인이 제출물을 검토해 요구사항을 지킨 것은 승인하고 나머지는 반려해요.', source: 0 },
      { subject: '지원 플랫폼', text: '클리핑 캠페인은 틱톡, 유튜브 쇼츠, X, 인스타그램 릴스를 안내해요.', source: 0 },
      { subject: '지급', text: '제출물을 승인하면 Whop이 조회수에 따라 크리에이터에게 자동으로 지급한다고 밝혀요.', source: 0 },
    ],
    related: ['clipers-vs-vyro', 'clipping-marketing', 'clipers-vs-influencer-marketing'],
    sources: whopSources,
  },
  {
    ...NAMED,
    slug: 'clipers-vs-vyro',
    title: 'Vyro와 Clipers, 무엇이 다른가요?',
    description: 'Vyro와 Clipers는 둘 다 숏폼 조회수만큼 지급하는 클리핑 플랫폼이에요. 조회수 확인 방식, 지원 플랫폼, 출금 방식과 운영 언어를 공개된 내용으로 비교했어요.',
    answer: [
      'Vyro는 캠페인마다 1,000회당 지급액을 공개하고, 크리에이터가 올린 숏폼의 조회수만큼 지급하는 해외 클리핑 플랫폼이에요.',
      'Clipers는 같은 조회수 기반 방식을 한국어와 원화로 운영하고, 국내 숏폼 플랫폼까지 함께 지원해요.',
    ],
    sections: [
      {
        heading: '조회수 확인 방식',
        paragraphs: ['Vyro는 제출 직후부터 조회수를 세고 매시간 갱신하며, 캠페인이 끝날 때 최종 확인을 한다고 밝혀요. Clipers는 유튜브 쇼츠 조회수를 자동으로 가져오고, 다른 플랫폼은 운영팀이 영상에 표시된 조회수를 직접 확인해요.'],
      },
      {
        heading: '지급과 운영 언어',
        paragraphs: ['Vyro는 최소 10달러부터 주 1회 출금할 수 있고, 지역에 따라 Stripe나 PayPal로 받는다고 안내해요. Clipers는 크리에이터에게 국내 계좌로 원화 정산하고, 한국어로 운영해요.'],
      },
      CLIPERS_SECTION,
      {
        heading: '이럴 때 맞아요',
        paragraphs: ['영어권 크리에이터와 해외 시청자를 겨냥한다면 Vyro 같은 해외 플랫폼이 맞아요. 국내 시청자와 국내 플랫폼, 한국어 크리에이터가 필요하다면 Clipers가 맞아요.'],
      },
    ],
    claims: [
      { subject: 'Vyro', text: '크리에이터가 숏폼으로 조회수를 얻어 돈을 받는 클리핑 플랫폼이라고 소개해요.', source: 0 },
      { subject: '비용 구조', text: '캠페인마다 1,000회당 지급액을 공개해요.', source: 0 },
      { subject: '검토', text: '각 캠페인을 확인하고, 올라온 게시물을 캠페인 규칙과 플랫폼 기준에 따라 검토한다고 밝혀요.', source: 0 },
      { subject: '지원 플랫폼', text: '인스타그램, 틱톡, 유튜브 쇼츠, X를 안내해요.', source: 0 },
      { subject: '조회수', text: '제출 직후부터 조회수를 세고 매시간 갱신하며, 캠페인 종료 때 최종 확인을 한다고 밝혀요.', source: 0 },
      { subject: '출금', text: '최소 10달러, 주 1회 출금이며 지역에 따라 Stripe나 PayPal을 쓴다고 안내해요.', source: 0 },
    ],
    related: ['clipers-vs-whop', 'clipping-marketing', 'clipers-vs-influencer-marketing'],
    sources: vyroSources,
  },
];
