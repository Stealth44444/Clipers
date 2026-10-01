import { UPDATED, YOUTUBE_PARTNER_HELP } from './common';
import { MIN_VIEWS, RATE, earnings } from './facts';
import type { Guide } from './types';

export const TOPIC_GUIDES: Guide[] = [
  {
    slug: 'earn-before-monetization',
    audience: 'creator',
    group: 'topic',
    title: '수익창출 전에도 쇼츠로 돈을 벌 수 있을까요?',
    description: '유튜브 수익창출 조건을 채우기 전에도, 캠페인에 참여해 올린 숏폼의 조회수만큼 받을 수 있어요. 구독자 조건 없이 새 채널로 시작하는 방법을 정리했어요.',
    answer: [
      '네. 유튜브 수익창출은 구독자 수와 시청 기준을 채워야 시작되지만, 그 전에도 캠페인에 참여해 숏폼을 올리면 조회수만큼 받을 수 있어요.',
      'Clipers는 구독자 조건이 없어서 새 채널도 바로 참여할 수 있어요.',
    ],
    sections: [
      {
        heading: '수익창출까지 시간이 걸리는 이유',
        paragraphs: [
          '유튜브 파트너 프로그램은 일정 수 이상의 구독자와 시청 시간 또는 쇼츠 조회수를 채워야 신청할 수 있어요. 새 채널이라면 이 기준을 채우는 데 시간이 걸릴 수 있어요.',
        ],
        links: [{ label: '유튜브 파트너 프로그램 기준 보기 (유튜브 고객센터)', href: YOUTUBE_PARTNER_HELP }],
      },
      {
        heading: '수익창출 전에도 돈이 되는 구조',
        paragraphs: [
          '브랜드나 아티스트, 크리에이터가 예산을 걸고 숏폼 제작을 요청하는 걸 캠페인이라고 해요. 캠페인에 참여해 영상을 올리면, 참여한 크리에이터들이 각자 영상의 조회수만큼 이 예산을 나눠 받아요.',
          '이 돈은 유튜브 광고 수익이 아니라 캠페인 예산에서 나와요. 그래서 내 채널의 수익창출 여부와 상관이 없어요.',
        ],
      },
      {
        heading: '올릴 소재도 정해져 있어요',
        paragraphs: [
          '캠페인마다 올릴 영상과 요구사항이 정해져 있어서, 무엇을 올릴지 고민하지 않고 꾸준히 올릴 수 있어요. 새 채널 초반에 업로드를 이어 가기에도 좋아요.',
        ],
      },
      {
        heading: '얼마나 받나요',
        paragraphs: [
          `1천 회당 ${RATE}인 캠페인이라면 조회수 10만 회에 ${earnings(100_000)}이에요. 영상 하나의 조회수가 ${MIN_VIEWS}를 넘으면 정산이 시작돼요.`,
        ],
        links: [{ label: '조회수별 금액 보기', href: '/guides/shorts-earnings-calculator' }],
      },
    ],
    faqIds: ['small-channel', 'fees', 'when-paid'],
    related: ['shorts-earnings-calculator', 'monetization-rejected', 'what-is-clipping'],
    updated: UPDATED,
  },
  {
    slug: 'what-is-clipping',
    audience: 'creator',
    group: 'topic',
    title: '클리핑 부업이란 뭔가요?',
    description: '클리핑은 캠페인이 정해 준 영상을 내 방식대로 편집해 숏폼으로 올리고, 조회수만큼 받는 부업이에요. 캠페인 구조와 편집 방법, 저작권까지 정리했어요.',
    answer: [
      '클리핑은 캠페인이 정해 준 영상을 내 방식대로 편집해 숏폼으로 올리고, 조회수만큼 받는 부업이에요.',
      '직접 찍지 않아도 되고, 편집 앱만 다룰 줄 알면 시작할 수 있어요.',
    ],
    sections: [
      {
        heading: '클리핑은 이렇게 돌아가요',
        paragraphs: [
          '브랜드나 아티스트, 크리에이터가 예산을 걸고 캠페인을 열어요. 참여한 크리에이터들은 각자 올린 영상의 조회수만큼 이 예산을 나눠 받고, 예산이 다 쓰이면 캠페인이 끝나요.',
        ],
      },
      {
        heading: '어떤 영상을 편집하나요',
        paragraphs: [
          '스트리머 방송, 신제품 영상, 게임 플레이처럼 쓸 수 있는 영상은 캠페인마다 달라요. 캠페인 안내에 쓸 수 있는 영상과 요구사항이 적혀 있어요.',
        ],
      },
      {
        heading: '편집은 내 방식대로',
        paragraphs: ['캠페인 요구사항만 지키면 나머지 편집은 자유예요. 이런 편집을 많이 해요.'],
        list: [
          '가장 재밌는 구간만 잘라 세로 영상으로 만들기',
          '자막 넣기',
          '첫 화면에 "POV:" 같은 훅 문구 넣기',
          '순서를 바꿔 이야기처럼 이어 붙이기',
        ],
      },
      {
        heading: '저작권은요',
        paragraphs: ['클리핑 캠페인은 원작자가 사용을 허락한 영상만 다뤄요. 허락 없이 남의 영상을 편집해 올리는 것과는 달라요.'],
        links: [{ label: '쇼츠 짜깁기와 저작권 알아보기', href: '/guides/copyright-safe-clipping' }],
      },
    ],
    faqIds: ['what-is-clipping', 'others-videos', 'rejected'],
    related: ['faceless-shortform', 'copyright-safe-clipping', 'earn-before-monetization'],
    counterpart: 'clipping-marketing',
    updated: UPDATED,
  },
  {
    slug: 'shorts-earnings-calculator',
    audience: 'creator',
    group: 'topic',
    title: '쇼츠 조회수 10만 회면 얼마를 받을까요?',
    description: `Clipers 캠페인 기준으로 쇼츠 조회수별 받는 금액을 정리했어요. 1천 회당 ${RATE}이면 10만 회에 ${earnings(100_000)}이에요.`,
    answer: [
      'Clipers 캠페인은 조회수 1천 회당 받는 금액이 미리 정해져 있어요.',
      `1천 회당 ${RATE}이면 1만 회에 ${earnings(10_000)}, 10만 회에 ${earnings(100_000)}, 100만 회에 ${earnings(1_000_000)}이에요. 클립당 최대 금액과 캠페인 예산 안에서 받아요.`,
    ],
    table: [1_000, 10_000, 50_000, 100_000, 500_000, 1_000_000],
    sections: [
      {
        heading: '계산 방법',
        paragraphs: ['받는 금액은 검증된 조회수를 1,000으로 나눈 뒤 1천 회당 금액을 곱한 값이에요. 1천 회당 금액은 캠페인마다 다르고, 지원하기 전에 공개돼요.'],
      },
      {
        heading: `${MIN_VIEWS}부터 정산돼요`,
        paragraphs: [`영상 하나의 조회수가 ${MIN_VIEWS}를 넘으면 그전 조회수까지 모두 정산되고, 그 뒤로 늘어난 조회수는 매주 이어서 정산돼요.`],
      },
      {
        heading: '유튜브 광고 수익과는 달라요',
        paragraphs: ['이 금액은 유튜브 광고 수익이 아니라 캠페인 예산에서 나와요. 그래서 수익창출 전 채널도 같은 기준으로 받아요.'],
      },
      {
        heading: '받을 수 있는 금액에는 상한이 있어요',
        paragraphs: ['영상 하나로 받을 수 있는 최대 금액은 캠페인마다 달라요. 또 캠페인 예산이 다 쓰이면 캠페인이 끝나요.'],
      },
    ],
    faqIds: ['how-much', 'per-clip-max', 'min-views'],
    related: ['earn-before-monetization', 'platforms', 'is-it-legit'],
    updated: UPDATED,
  },
  {
    slug: 'faceless-shortform',
    audience: 'creator',
    group: 'topic',
    title: '얼굴 안 나오는 숏폼으로도 돈을 벌 수 있나요?',
    description: '클리핑 캠페인은 정해진 영상을 편집해 올리기 때문에 얼굴을 드러내지 않아도 돼요. 얼굴 없이 숏폼으로 수익을 내는 방법을 정리했어요.',
    answer: [
      '네. 클리핑 캠페인은 캠페인이 정해 준 영상을 편집해 올리기 때문에 얼굴을 드러내지 않아도 돼요.',
      '캡컷 같은 편집 앱만 다룰 줄 알면 시작할 수 있고, 올린 영상의 조회수만큼 받아요.',
    ],
    sections: [
      {
        heading: '얼굴 없이 할 수 있는 숏폼',
        paragraphs: ['클리핑은 캠페인이 정해 준 영상을 편집해 올리는 일이라 내 얼굴이 나올 일이 없어요. 소개 캠페인도 요구사항에 따라 손이나 제품만 나오게 찍을 수 있어요.'],
      },
      {
        heading: '필요한 건 편집 앱 하나',
        paragraphs: ['휴대폰이나 컴퓨터의 편집 앱으로 자르고 자막을 넣을 수 있으면 충분해요. 따로 촬영 장비를 갖출 필요는 없어요.'],
      },
      {
        heading: '올리고 링크만 제출해요',
        paragraphs: ['편집한 영상은 내 채널에 올리고, 영상 링크를 제출하면 운영팀이 검수해요. 검수를 통과한 영상은 조회수만큼 정산돼요.'],
      },
    ],
    faqIds: ['small-channel', 'others-videos', 'platforms'],
    related: ['what-is-clipping', 'side-job-office-workers', 'side-job-stay-at-home-parents'],
    updated: UPDATED,
  },
];
