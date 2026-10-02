import { REVIEWED, UPDATED } from './common';
import type { Guide } from './types';

export const ADVERTISER_PROBLEM_GUIDES: Guide[] = [
  {
    slug: 'clipping-marketing',
    audience: 'advertiser',
    group: 'advertiser-problem',
    title: '클리핑 마케팅이란 뭔가요?',
    description: '클리핑 마케팅은 영상과 예산을 맡기면, 여러 크리에이터가 숏폼으로 편집해 올리고 검증된 조회수만큼만 예산이 쓰이는 방식이에요. 구조와 장점을 정리했어요.',
    answer: [
      '클리핑 마케팅은 영상과 예산을 맡기면, 여러 크리에이터가 그 영상을 숏폼으로 편집해 올리고 검증된 조회수만큼만 예산이 쓰이는 방식이에요.',
      '광고 영상 한 편을 내보내는 대신, 여러 계정에서 여러 버전의 숏폼이 퍼져요.',
    ],
    sections: [
      {
        heading: '이렇게 돌아가요',
        paragraphs: ['예산과 요구사항을 정해 캠페인을 열면 크리에이터들이 지원하고, 운영팀이 승인한 크리에이터가 숏폼을 올려요. 검수를 통과한 영상의 검증된 조회수만큼 예산이 쓰이고, 예산이 다 쓰이면 캠페인이 끝나요.'],
      },
      {
        heading: '광고 한 편과 다른 점',
        paragraphs: ['한 편의 광고를 송출하는 대신, 여러 크리에이터가 각자의 채널과 스타일로 서로 다른 버전을 만들어요. 그중 반응이 오는 영상의 조회수만큼만 예산이 쓰여요.'],
      },
      {
        heading: '허락한 영상으로만',
        paragraphs: ['클리핑 캠페인은 원작자가 사용을 허락한 영상으로 열려요. 써도 되는 영상과 범위는 요구사항으로 정해요.'],
      },
    ],
    faqIds: ['cost', 'creators', 'view-verification'],
    related: ['pay-per-view', 'viral-without-influencers', 'repurpose-longform'],
    counterpart: 'what-is-clipping',
    updated: UPDATED,
    reviewed: REVIEWED,
  },
  {
    slug: 'pay-per-view',
    audience: 'advertiser',
    group: 'advertiser-problem',
    title: '광고비를 조회수만큼만 쓰는 방법이 있나요?',
    description: '클리핑 캠페인은 검수를 통과한 영상의 검증된 조회수만큼만 예산이 쓰여요. 예산이 쓰이는 방식과 미리 확인하는 방법을 정리했어요.',
    answer: [
      '클리핑 캠페인은 검수를 통과한 영상의 검증된 조회수만큼만 예산이 쓰여요.',
      '조회수가 나오지 않으면 예산도 쓰이지 않고, 남은 예산은 실시간으로 볼 수 있어요.',
    ],
    sections: [
      {
        heading: '예산이 쓰이는 순서',
        paragraphs: ['영상이 올라오면 운영팀이 검수하고, 통과한 영상의 조회수를 플랫폼별로 확인한 뒤에 그만큼 예산이 쓰여요. 검수를 통과하지 못한 영상에는 예산이 쓰이지 않아요.'],
      },
      {
        heading: '한 영상에 몰리지 않게',
        paragraphs: ['클립 하나가 받을 수 있는 금액에 상한을 둘 수 있어요. 예산이 여러 영상에 나눠 쓰여요.'],
      },
      {
        heading: '미리 확인해요',
        paragraphs: ['캠페인을 만들 때 예산을 넣으면 그 예산으로 받을 수 있는 최대 조회수를 바로 보여 드려요. 다 못 쓴 예산은 캠페인을 중단하면 잔액이 되고, 다음 캠페인에 쓰거나 반환받을 수 있어요.'],
      },
    ],
    faqIds: ['cost', 'expected-views', 'leftover'],
    related: ['verified-views', 'clipping-marketing', 'for-startups'],
    updated: UPDATED,
    reviewed: REVIEWED,
  },
  {
    slug: 'viral-without-influencers',
    audience: 'advertiser',
    group: 'advertiser-problem',
    title: '인플루언서 섭외 없이 숏폼 바이럴을 할 수 있나요?',
    description: '캠페인을 열면 크리에이터들이 직접 지원하고, 운영팀이 승인한 크리에이터만 참여해요. 섭외와 정산 없이 여러 크리에이터의 숏폼을 모으는 방법이에요.',
    answer: [
      '캠페인을 열면 크리에이터들이 직접 지원해요. 운영팀이 승인한 크리에이터만 참여하고, 정산과 지급은 Clipers가 맡아요.',
      '한 명을 섭외하는 대신 여러 크리에이터가 각자 다른 버전을 올려요.',
    ],
    sections: [
      {
        heading: '섭외 대신 지원과 승인',
        paragraphs: ['한 명씩 연락하고 조건을 맞추는 대신, 캠페인을 열어 두면 크리에이터들이 지원해요. 운영팀이 지원을 확인하고 승인한 사람만 영상을 올려요.'],
      },
      {
        heading: '여러 크리에이터, 여러 버전',
        paragraphs: ['참여한 크리에이터마다 자기 채널과 스타일로 숏폼을 만들어요. 반응이 오는 영상의 조회수만큼 예산이 쓰여요.'],
      },
      {
        heading: '정산과 지급은 Clipers가',
        paragraphs: ['크리에이터마다 조회수를 확인하고 정산해 지급하는 일은 Clipers가 맡아요. 광고주는 캠페인 하나의 예산만 관리하면 돼요.'],
      },
    ],
    faqIds: ['creators', 'cost', 'platforms'],
    related: ['clipping-marketing', 'for-brands', 'pay-per-view'],
    updated: UPDATED,
    reviewed: REVIEWED,
  },
  {
    slug: 'repurpose-longform',
    audience: 'advertiser',
    group: 'advertiser-problem',
    title: '롱폼 영상을 숏폼으로 재활용하려면?',
    description: '가진 롱폼 영상으로 클리핑 캠페인을 열면, 크리에이터들이 구간을 골라 숏폼으로 편집해 올려요. 한 편의 롱폼에서 여러 버전의 숏폼이 나와요.',
    answer: [
      '가진 롱폼 영상으로 클리핑 캠페인을 열면, 크리에이터들이 구간을 골라 숏폼으로 편집해 올려요.',
      '한 편의 롱폼에서 여러 버전의 숏폼이 나오고, 검증된 조회수만큼만 예산이 쓰여요.',
    ],
    sections: [
      {
        heading: '어떤 롱폼이 맞나요',
        paragraphs: ['방송, 웨비나, 인터뷰, 브이로그, 강의처럼 이미 찍어 둔 긴 영상이라면 무엇이든 클리핑 캠페인의 재료가 될 수 있어요.'],
      },
      {
        heading: '쓸 수 있는 범위를 정해요',
        paragraphs: ['써도 되는 구간과 피해야 할 내용, 출처 표기 방법을 요구사항에 적어 두면 돼요.'],
      },
      {
        heading: '여러 버전이 생겨요',
        paragraphs: ['크리에이터마다 다른 구간과 다른 편집으로 숏폼을 만들어서, 한 편의 롱폼이 여러 개의 숏폼으로 퍼져요.'],
      },
    ],
    faqIds: ['cost', 'review-time', 'platforms'],
    related: ['for-broadcasters', 'clipping-marketing', 'for-content-ip'],
    updated: UPDATED,
    reviewed: REVIEWED,
  },
  {
    slug: 'verified-views',
    audience: 'advertiser',
    group: 'advertiser-problem',
    title: '숏폼 바이럴 조회수, 믿을 수 있나요?',
    description: 'Clipers는 올라온 영상을 사람이 검수하고, 조회수를 플랫폼별로 확인한 뒤에만 예산을 써요. 비정상적으로 늘어난 조회수는 따로 확인해요.',
    answer: [
      'Clipers는 올라온 영상을 사람이 검수하고, 조회수를 플랫폼별로 확인한 뒤에만 예산을 써요.',
      '짧은 시간에 비정상적으로 늘어난 조회수는 따로 확인하고, 걸러진 조회수에는 예산이 쓰이지 않아요.',
    ],
    sections: [
      {
        heading: '사람이 검수해요',
        paragraphs: ['올라온 영상은 운영팀이 요구사항대로인지 직접 확인해요. 통과한 영상만 정산 대상이 돼요.'],
      },
      {
        heading: '플랫폼별로 확인해요',
        paragraphs: ['유튜브는 조회수를 자동으로 가져오고, 다른 플랫폼은 운영팀이 영상에 표시된 조회수를 직접 확인해요.'],
      },
      {
        heading: '급증은 따로 봐요',
        paragraphs: ['짧은 시간에 비정상적으로 늘어난 조회수는 정산 전에 따로 확인해요. 걸러진 조회수에는 예산이 쓰이지 않아요.'],
      },
    ],
    faqIds: ['view-verification', 'creators', 'cost'],
    related: ['pay-per-view', 'clipping-marketing', 'for-agencies'],
    counterpart: 'is-it-legit',
    updated: UPDATED,
    reviewed: REVIEWED,
  },
];
