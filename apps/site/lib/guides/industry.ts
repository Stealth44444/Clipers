import { UPDATED } from './common';
import { MIN_BUDGET } from './facts';
import type { Guide } from './types';

export const INDUSTRY_GUIDES: Guide[] = [
  {
    slug: 'for-brands',
    audience: 'advertiser',
    group: 'industry',
    industry: '브랜드·소비재·D2C',
    title: '신제품을 숏폼으로 빠르게 알리려면 어떻게 하나요?',
    description: '캠페인을 열면 여러 크리에이터가 제품 소개 숏폼과 편집 숏폼을 올리고, 검증된 조회수만큼만 예산이 쓰여요. 신제품 출시에 맞춰 숏폼을 모으는 방법을 정리했어요.',
    answer: [
      '캠페인을 열면 여러 크리에이터가 제품을 소개하는 숏폼이나, 제공한 영상을 편집한 숏폼을 올려요.',
      '검수를 통과한 영상의 검증된 조회수만큼만 예산이 쓰여서, 반응이 없는 영상에는 예산이 나가지 않아요.',
    ],
    sections: [
      {
        heading: '소개 캠페인과 클리핑 캠페인',
        paragraphs: [
          '소개 캠페인은 크리에이터가 제품이나 서비스를 자기 스타일로 소개하는 숏폼을 찍는 방식이에요. 클리핑 캠페인은 광고 영상이나 촬영본을 제공하면 크리에이터들이 숏폼으로 편집해 올리는 방식이에요.',
          '어느 쪽이든 여러 크리에이터가 각자 다른 버전을 만들어요.',
        ],
      },
      {
        heading: '출시 일정에 맞춰요',
        paragraphs: ['캠페인을 만들고 예산을 입금하면, 운영팀이 입금을 확인한 뒤 공개돼요. 출시일보다 여유 있게 캠페인을 만들어 두세요. 올라온 영상은 24시간이나 48시간 안에 검수해요.'],
      },
      {
        heading: '꼭 지킬 것은 요구사항으로',
        paragraphs: ['꼭 넣어야 할 문구와 태그, 피해야 할 표현을 요구사항에 적어 두면 운영팀이 검수할 때 그대로 확인해요. 요구사항을 지키지 않은 영상에는 예산이 쓰이지 않아요.'],
      },
    ],
    faqIds: ['cost', 'expected-views', 'review-time'],
    related: ['for-startups', 'viral-without-influencers', 'pay-per-view'],
    updated: UPDATED,
  },
  {
    slug: 'for-broadcasters',
    audience: 'advertiser',
    group: 'industry',
    industry: '방송국·OTT·제작사',
    title: '예능·드라마 클립을 숏폼으로 더 퍼뜨리려면?',
    description: '방송 영상으로 클리핑 캠페인을 열면 여러 크리에이터가 하이라이트를 숏폼으로 편집해 각자 채널에 올려요. 방영 전후에 클립을 퍼뜨리는 방법을 정리했어요.',
    answer: [
      '방송 영상으로 클리핑 캠페인을 열면, 여러 크리에이터가 하이라이트를 골라 숏폼으로 편집해 각자 채널에 올려요.',
      '공식 채널 하나가 아니라 여러 계정에서 함께 퍼지고, 검증된 조회수만큼만 예산이 쓰여요.',
    ],
    sections: [
      {
        heading: '쓸 수 있는 영상과 범위를 정해요',
        paragraphs: ['어떤 회차와 장면을 써도 되는지, 길이와 출처 표기는 어떻게 할지 요구사항에 적어 두면 돼요.'],
      },
      {
        heading: '방영 전후에 맞춰요',
        paragraphs: ['예고편으로 방영 전에, 방영 직후에는 하이라이트로 이어서 캠페인을 열 수 있어요. 검수 시간을 24시간으로 고르면 올라온 영상을 더 빨리 확인해요.'],
      },
      {
        heading: '사람이 직접 검수해요',
        paragraphs: ['올라온 영상은 운영팀이 요구사항대로인지 직접 확인해요. 통과한 영상만 정산되고, 그 영상의 검증된 조회수만큼만 예산이 쓰여요.'],
      },
    ],
    faqIds: ['creators', 'review-time', 'view-verification'],
    related: ['repurpose-longform', 'clipping-marketing', 'verified-views'],
    counterpart: 'copyright-safe-clipping',
    updated: UPDATED,
  },
  {
    slug: 'for-film',
    audience: 'advertiser',
    group: 'industry',
    industry: '영화 제작·배급사',
    title: '개봉 전 영화를 숏폼으로 홍보하려면?',
    description: '예고편과 공개 클립으로 클리핑 캠페인을 열면, 개봉 전부터 여러 크리에이터가 숏폼으로 편집해 퍼뜨려요. 개봉일에 맞춰 캠페인을 여는 방법을 정리했어요.',
    answer: [
      '예고편과 공개 클립으로 클리핑 캠페인을 열면, 개봉 전부터 여러 크리에이터가 숏폼으로 편집해 퍼뜨려요.',
      '검증된 조회수만큼만 예산이 쓰이고, 남은 예산은 실시간으로 볼 수 있어요.',
    ],
    sections: [
      {
        heading: '개봉일에서 거꾸로 일정을 잡아요',
        paragraphs: ['캠페인은 입금이 확인된 뒤 공개돼요. 개봉일보다 여유 있게 캠페인을 열어 두면, 개봉 전까지 숏폼이 쌓여요.'],
      },
      {
        heading: '스포일러 범위는 요구사항으로',
        paragraphs: ['써도 되는 장면과 피해야 할 장면, 공개해도 되는 정보를 요구사항에 적어 두세요. 운영팀이 검수할 때 확인해요.'],
      },
      {
        heading: '올릴 플랫폼을 골라요',
        paragraphs: ['유튜브 쇼츠, 틱톡, 인스타그램 릴스, 페이스북, X, 네이버 클립, 카카오 숏폼 중에서 캠페인마다 고를 수 있어요.'],
      },
    ],
    faqIds: ['start-time', 'platforms', 'budget-exhausted'],
    related: ['for-broadcasters', 'repurpose-longform', 'pay-per-view'],
    updated: UPDATED,
  },
  {
    slug: 'for-music',
    audience: 'advertiser',
    group: 'industry',
    industry: '음반사·기획사·아티스트',
    title: '신곡과 무대 영상을 숏폼으로 퍼뜨리려면?',
    description: '무대나 뮤직비디오 영상으로 클리핑 캠페인을 열면, 직캠과 무대 편집에 익숙한 크리에이터들이 숏폼으로 퍼뜨려요. 음원을 쓰는 음악 캠페인은 준비 중이에요.',
    answer: [
      '무대나 뮤직비디오 영상으로 클리핑 캠페인을 열면, 직캠과 무대 편집에 익숙한 크리에이터들이 숏폼으로 퍼뜨려요.',
      '음원을 배경음으로 쓰는 음악 캠페인은 준비하고 있어요.',
    ],
    sections: [
      {
        heading: '무대와 뮤직비디오 클립',
        paragraphs: ['어떤 무대와 뮤직비디오, 어느 구간을 써도 되는지 요구사항에 적어 두면 크리에이터들이 그 안에서 편집해요.'],
      },
      {
        heading: '팬 편집자들과 만나는 곳',
        paragraphs: ['이미 무대와 직캠을 편집해 올리던 크리에이터들이 공식 캠페인으로 참여할 수 있어요. 허락받은 영상으로 편집하고, 조회수만큼 예산을 나눠 받아요.'],
      },
      {
        heading: '음악 캠페인은 준비 중이에요',
        paragraphs: ['음원을 배경음으로 쓰거나 챌린지를 여는 음악 캠페인은 준비하고 있어요. 지금은 무대와 뮤직비디오 영상을 편집하는 클리핑 캠페인으로 열 수 있어요.'],
      },
    ],
    faqIds: ['music', 'creators', 'cost'],
    related: ['for-streamers', 'clipping-marketing', 'viral-without-influencers'],
    counterpart: 'fan-edits',
    updated: UPDATED,
  },
  {
    slug: 'for-streamers',
    audience: 'advertiser',
    group: 'industry',
    industry: '스트리머·유튜버',
    title: '내 방송 클립을 여러 채널에서 퍼뜨리려면?',
    description: '방송 영상으로 클리핑 캠페인을 열면, 클립 크리에이터들이 하이라이트를 쇼츠로 편집해 각자 채널에 올려요. 비용은 검증된 조회수만큼만 나가요.',
    answer: [
      '방송 영상으로 클리핑 캠페인을 열면, 클립 크리에이터들이 하이라이트를 쇼츠로 편집해 각자 채널에 올려요.',
      '내 방송을 아직 모르는 시청자에게 닿는 통로가 늘어나고, 비용은 검증된 조회수만큼만 나가요.',
    ],
    sections: [
      {
        heading: '쓸 방송과 구간을 정해요',
        paragraphs: ['어떤 방송과 다시보기를 써도 되는지, 피해야 할 장면이 있는지 요구사항에 적어 두면 돼요.'],
      },
      {
        heading: '내 채널을 알리는 요구사항',
        paragraphs: ['영상 안이나 설명에 내 채널 이름을 넣도록 요구사항에 적을 수 있어요. 운영팀이 검수할 때 확인해요.'],
      },
      {
        heading: '비용은 조회수만큼만',
        paragraphs: ['검증된 조회수만큼만 예산이 쓰이고, 클립 하나가 받을 수 있는 금액에 상한을 둘 수 있어요. 한 영상이 예산을 독차지하지 않아요.'],
      },
    ],
    faqIds: ['cost', 'clip-cap', 'creators'],
    related: ['for-music', 'clipping-marketing', 'repurpose-longform'],
    counterpart: 'fan-edits',
    updated: UPDATED,
  },
  {
    slug: 'for-games',
    audience: 'advertiser',
    group: 'industry',
    industry: '게임사',
    title: '게임 출시와 업데이트를 숏폼으로 알리려면?',
    description: '트레일러와 플레이 영상으로 클리핑 캠페인을 열거나, 크리에이터가 직접 플레이하며 소개하는 소개 캠페인을 열 수 있어요. 검증된 조회수만큼만 예산이 쓰여요.',
    answer: [
      '트레일러와 플레이 영상으로 클리핑 캠페인을 열거나, 크리에이터가 직접 플레이하며 소개하는 소개 캠페인을 열 수 있어요.',
      '검증된 조회수만큼만 예산이 쓰여요.',
    ],
    sections: [
      {
        heading: '출시와 업데이트 시점에 맞춰요',
        paragraphs: ['캠페인은 입금이 확인된 뒤 공개돼요. 출시일이나 업데이트일보다 여유 있게 열어 두세요.'],
      },
      {
        heading: '클리핑과 소개 캠페인 고르기',
        paragraphs: ['트레일러와 플레이 영상이 있다면 클리핑 캠페인, 크리에이터의 플레이 반응을 보여 주고 싶다면 소개 캠페인이 맞아요.'],
      },
      {
        heading: '올릴 플랫폼을 골라요',
        paragraphs: ['게임 이용자가 많은 플랫폼을 캠페인마다 골라 올리게 할 수 있어요.'],
      },
    ],
    faqIds: ['start-time', 'platforms', 'expected-views'],
    related: ['for-streamers', 'for-startups', 'pay-per-view'],
    updated: UPDATED,
  },
  {
    slug: 'for-startups',
    audience: 'advertiser',
    group: 'industry',
    industry: '앱·스타트업·커뮤니티',
    title: '적은 예산으로 앱·서비스를 숏폼으로 알리려면?',
    description: `캠페인은 ${MIN_BUDGET}부터 열 수 있고, 검증된 조회수만큼만 예산이 쓰여서 작은 예산으로도 시작할 수 있어요. 앱과 서비스를 숏폼으로 알리는 방법을 정리했어요.`,
    answer: [
      `캠페인은 ${MIN_BUDGET}부터 열 수 있고, 검증된 조회수만큼만 예산이 쓰여서 작은 예산으로도 시작할 수 있어요.`,
      '크리에이터들이 서비스를 소개하는 숏폼이나, 서비스 속 재밌는 순간을 편집한 숏폼을 올려요.',
    ],
    sections: [
      {
        heading: '작게 시작해요',
        paragraphs: ['캠페인을 만들 때 예산을 넣으면 예상 조회수를 바로 확인할 수 있어요. 작은 예산으로 먼저 열어 보고 반응을 본 뒤 다음 캠페인을 정하면 돼요.'],
      },
      {
        heading: '클립당 상한으로 예산을 나눠요',
        paragraphs: ['클립 하나가 받을 수 있는 금액에 상한을 두면, 한 영상에 예산이 몰리지 않고 여러 영상에 나눠 쓰여요.'],
      },
      {
        heading: '서비스 속 순간을 클립으로',
        paragraphs: ['커뮤니티의 재밌는 글, 앱을 쓰는 화면, 이용 장면처럼 서비스 안의 순간을 영상으로 제공하면 크리에이터들이 숏폼으로 편집해요.'],
      },
    ],
    faqIds: ['min-budget', 'expected-views', 'clip-cap'],
    related: ['for-brands', 'pay-per-view', 'viral-without-influencers'],
    updated: UPDATED,
  },
  {
    slug: 'for-content-ip',
    audience: 'advertiser',
    group: 'industry',
    industry: '웹툰·출판·교육',
    title: '웹툰·책·강의를 숏폼으로 소개하려면?',
    description: '작품 장면이나 강의 핵심을 편집하는 클리핑 캠페인, 직접 읽거나 들어 보고 소개하는 소개 캠페인으로 숏폼을 모을 수 있어요.',
    answer: [
      '작품 장면이나 강의 핵심을 편집하는 클리핑 캠페인, 직접 읽거나 들어 보고 소개하는 소개 캠페인으로 숏폼을 모을 수 있어요.',
      '검증된 조회수만큼만 예산이 쓰여요.',
    ],
    sections: [
      {
        heading: '웹툰과 웹소설',
        paragraphs: ['써도 되는 컷과 회차, 줄거리를 어디까지 공개할지 요구사항에 적어 두면 크리에이터들이 그 안에서 숏폼으로 만들어요.'],
      },
      {
        heading: '책',
        paragraphs: ['소개 캠페인으로 크리에이터가 책을 읽고 자기 말로 소개하는 숏폼을 모을 수 있어요.'],
      },
      {
        heading: '강의',
        paragraphs: ['강의 영상의 핵심 장면을 제공하면 크리에이터들이 짧게 편집해 올려요. 써도 되는 구간은 요구사항으로 정해요.'],
      },
    ],
    faqIds: ['cost', 'creators', 'review-time'],
    related: ['repurpose-longform', 'clipping-marketing', 'for-brands'],
    updated: UPDATED,
  },
  {
    slug: 'for-live-events',
    audience: 'advertiser',
    group: 'industry',
    industry: '스포츠·공연·페스티벌',
    title: '경기·공연·페스티벌 영상을 숏폼으로 퍼뜨리려면?',
    description: '하이라이트와 현장 영상으로 클리핑 캠페인을 열면, 여러 크리에이터가 숏폼으로 편집해 퍼뜨려요. 일정에 맞춰 캠페인을 여는 방법을 정리했어요.',
    answer: [
      '하이라이트와 현장 영상으로 클리핑 캠페인을 열면, 여러 크리에이터가 숏폼으로 편집해 퍼뜨려요.',
      '검수 시간을 24시간으로 고르면 올라온 영상을 더 빨리 확인해요.',
    ],
    sections: [
      {
        heading: '일정에 맞춰요',
        paragraphs: ['티켓 오픈 전, 개막 직전, 경기나 공연 직후처럼 알리고 싶은 시점에 맞춰 캠페인을 열어요. 캠페인은 입금이 확인된 뒤 공개돼요.'],
      },
      {
        heading: '쓸 수 있는 영상의 범위',
        paragraphs: ['중계권이나 공연 영상의 사용 범위가 정해져 있다면, 써도 되는 영상과 구간을 요구사항에 분명히 적어 주세요.'],
      },
      {
        heading: '빠른 검수',
        paragraphs: ['검수 시간을 24시간으로 고르면 올라온 영상을 하루 안에 확인해요. 통과한 영상의 검증된 조회수만큼만 예산이 쓰여요.'],
      },
    ],
    faqIds: ['review-time', 'start-time', 'platforms'],
    related: ['for-broadcasters', 'repurpose-longform', 'verified-views'],
    updated: UPDATED,
  },
  {
    slug: 'for-local-tourism',
    audience: 'advertiser',
    group: 'industry',
    industry: '지자체·관광',
    title: '지역과 관광지를 숏폼으로 알리려면?',
    description: '관광 영상을 편집하는 클리핑 캠페인이나, 다녀온 경험을 소개하는 소개 캠페인으로 지역을 알리는 숏폼을 모을 수 있어요. 검증된 조회수만큼만 예산이 쓰여요.',
    answer: [
      '관광 영상을 편집하는 클리핑 캠페인이나, 다녀온 경험을 소개하는 소개 캠페인으로 지역을 알리는 숏폼을 모을 수 있어요.',
      '검증된 조회수만큼만 예산이 쓰여요.',
    ],
    sections: [
      {
        heading: '클리핑과 소개 캠페인',
        paragraphs: ['홍보 영상이나 촬영본이 있다면 클리핑 캠페인으로, 크리에이터의 시선으로 보여 주고 싶다면 소개 캠페인으로 열 수 있어요.'],
      },
      {
        heading: '계절과 축제 일정에 맞춰요',
        paragraphs: ['꽃 피는 시기, 축제, 성수기처럼 알리고 싶은 때에 맞춰 캠페인을 열어요. 캠페인은 입금이 확인된 뒤 공개돼요.'],
      },
      {
        heading: '계약과 서류는 먼저 상담해요',
        paragraphs: ['계약이나 정산 서류가 필요하면 상담 문의로 먼저 알려 주세요. 진행 방법을 안내해 드려요.'],
        links: [{ label: '상담 문의', href: '/contact?from=/guides/for-local-tourism' }],
      },
    ],
    faqIds: ['min-budget', 'cost', 'leftover'],
    related: ['for-live-events', 'for-brands', 'viral-without-influencers'],
    updated: UPDATED,
  },
  {
    slug: 'for-agencies',
    audience: 'advertiser',
    group: 'industry',
    industry: '에이전시·MCN',
    title: '고객사 숏폼 바이럴을 클리핑 캠페인으로 운영하려면?',
    description: '고객사별로 캠페인을 열고, 캠페인마다 검증된 조회수와 받은 영상, 사용한 예산을 확인하며 운영할 수 있어요. 대행 조건은 상담 문의로 안내해 드려요.',
    answer: [
      '고객사별로 캠페인을 열고, 캠페인마다 검증된 조회수와 받은 영상, 사용한 예산을 확인하며 운영할 수 있어요.',
      '대행 조건은 상담 문의로 알려 주시면 안내해 드려요.',
    ],
    sections: [
      {
        heading: '캠페인 단위로 운영해요',
        paragraphs: ['고객사의 목표에 맞춰 캠페인마다 예산, 올릴 플랫폼, 요구사항, 검수 시간을 따로 정할 수 있어요.'],
      },
      {
        heading: '대시보드에서 보는 것',
        paragraphs: ['캠페인마다 사용한 예산, 예상 조회수, 검증된 조회수, 받은 영상을 확인할 수 있어요. 고객사 보고에 그대로 쓸 수 있는 숫자예요.'],
      },
      {
        heading: '대행 조건은 상담으로',
        paragraphs: ['여러 고객사를 함께 운영하거나 별도 조건이 필요하면 상담 문의로 알려 주세요.'],
        links: [{ label: '상담 문의', href: '/contact?from=/guides/for-agencies' }],
      },
    ],
    faqIds: ['view-verification', 'budget-exhausted', 'leftover'],
    related: ['clipping-marketing', 'verified-views', 'pay-per-view'],
    updated: UPDATED,
  },
];
