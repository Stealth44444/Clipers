import { REVIEWED } from './common';
import { MIN_BUDGET } from './facts';
import { SOURCES } from './sources';
import type { Guide } from './types';

// Cost and budget, explained by structure. No rates and no expected-view numbers: budget ÷ views would reveal the
// brand rate, which stays private. The budget → maximum views figure exists only on the signed-in campaign form.

const UPDATED = '2026-10-02';

export const COST_GUIDES: Guide[] = [
  {
    slug: 'short-form-marketing-cost',
    audience: 'advertiser',
    group: 'cost',
    title: '숏폼 마케팅 비용은 어떻게 정해지나요?',
    description: '숏폼 마케팅 비용은 방식마다 생기는 시점이 달라요. 광고 노출, 인플루언서 섭외, 구독형 도구, 체험단, 검증된 조회수만큼 내는 방식을 구조로 비교했어요.',
    answer: [
      '숏폼 마케팅 비용은 무엇에 돈을 내는지에 따라 정해져요. 광고는 노출이나 클릭에, 인플루언서 섭외는 게시물에, 클리핑 캠페인은 검증된 조회수에 비용을 내요.',
      `Clipers 캠페인은 ${MIN_BUDGET}(부가세 별도)부터 열 수 있고, 검수를 통과한 영상의 검증된 조회수만큼만 예산이 쓰여요.`,
    ],
    sections: [
      {
        heading: '방식별로 비용이 생기는 곳',
        paragraphs: ['같은 예산이라도 어디에 쓰이는지가 달라요. 아래는 가격이 아니라 비용이 생기는 구조예요.'],
        list: [
          '숏폼 유료 광고: 플랫폼의 노출이나 클릭에 비용을 내요.',
          '인플루언서 섭외: 게시물을 올리기로 한 인플루언서에게 건별로 비용을 내요.',
          '인플루언서 검색 도구: 도구 사용료(구독)를 내고, 인플루언서 비용은 따로예요.',
          '체험단: 제품이나 이용권 같은 혜택과 운영 비용이 들어요.',
          '클리핑 캠페인: 검수를 통과한 영상의 검증된 조회수만큼 예산이 쓰여요.',
        ],
        links: [
          { label: '인플루언서 마케팅과 클리핑 캠페인 비교', href: '/guides/clipers-vs-influencer-marketing' },
          { label: '숏폼 유료 광고와 클리핑 캠페인 비교', href: '/guides/clipers-vs-short-form-ads' },
        ],
      },
      {
        heading: 'Clipers에서 예산이 쓰이는 순서',
        paragraphs: [
          '캠페인을 만들고 예산을 입금하면, 운영팀이 입금을 확인한 뒤 캠페인이 공개돼요. 크리에이터가 영상을 올리면 검수를 거치고, 통과한 영상의 검증된 조회수만큼 매주 예산에서 차감돼요. 조회수가 나오지 않은 영상에는 예산이 쓰이지 않아요.',
        ],
      },
      {
        heading: '부가세와 남은 금액',
        paragraphs: [
          '캠페인 예산은 부가세 별도예요. 캠페인을 중단하면 그 주까지 정산한 뒤 남은 금액이 잔액이 되고, 잔액은 다음 캠페인에 쓰거나 확정된 날부터 5년 안에 수수료 없이 반환받을 수 있어요.',
        ],
      },
      {
        heading: '광고 표시 비용은 따로 없어요',
        paragraphs: ['어느 방식이든 대가를 받은 게시물에는 광고 표시가 필요해요. 표시 문구는 캠페인 요구사항에 적으면 돼요.'],
        links: [{ label: '숏폼 광고 표시는 어떻게 해야 하나요?', href: '/guides/ad-disclosure-rules' }],
      },
    ],
    faqIds: ['min-budget', 'cost', 'leftover', 'budget-exhausted'],
    related: ['short-form-budget-planning', 'pay-per-view', 'clipers-vs-influencer-marketing'],
    updated: UPDATED,
    reviewed: REVIEWED,
    sources: [SOURCES.adDisclosure],
  },
  {
    slug: 'short-form-budget-planning',
    audience: 'advertiser',
    group: 'cost',
    title: '숏폼 캠페인 예산은 얼마로 잡아야 하나요?',
    description: '숏폼 캠페인 예산은 목표와 기간, 영상 하나에 쓸 상한으로 정해요. 테스트·출시·지속 운영별로 예산을 정하는 순서와 예산이 나뉘는 장치를 정리했어요.',
    answer: [
      `숏폼 캠페인 예산은 목표에 맞춰 정하되, Clipers에서는 ${MIN_BUDGET}(부가세 별도)부터 시작할 수 있어요.`,
      '캠페인을 만들 때 예산을 넣으면 그 예산으로 받을 수 있는 최대 조회수를 바로 보여 주니, 숫자를 보면서 조정하면 돼요.',
    ],
    sections: [
      {
        heading: '목표부터 정해요',
        list: [
          '처음 시험해 보는 경우: 최소 예산으로 짧게 열어 어떤 영상이 반응을 얻는지 봐요.',
          '신제품·개봉·컴백처럼 날짜가 정해진 출시: 공개 전후 기간에 예산을 모아요.',
          '꾸준한 노출: 월 단위로 예산을 나눠 캠페인을 이어서 열어요.',
        ],
        paragraphs: ['같은 예산도 기간이 짧으면 한꺼번에, 길면 나눠서 쓰여요.'],
      },
      {
        heading: '예산이 한 곳에 몰리지 않게',
        paragraphs: [
          '영상 하나가 받을 수 있는 금액에 상한을 두면 예산이 여러 영상에 나뉘어요. 크리에이터 한 명이 받을 수 있는 금액에도 상한이 있어서, 한 사람이 예산을 다 가져가지 않아요. 크리에이터 1명당 하루 제출 한도도 고를 수 있어요.',
        ],
      },
      {
        heading: '화면에서 숫자를 보며 정해요',
        paragraphs: [
          '캠페인 만들기 화면에서 예산을 넣으면 그 예산으로 받을 수 있는 최대 조회수가 바로 보여요. 실제 조회수는 올라온 영상의 반응에 따라 달라지고, 덜 나오면 남은 예산은 쓰이지 않아요.',
        ],
      },
      {
        heading: '상담이 필요하면',
        paragraphs: ['캠페인 구성이나 예산 배분이 고민되면 상담 문의를 남겨 주세요. 운영팀이 이메일로 답해 드려요.'],
        links: [{ label: '상담 문의', href: '/contact?from=/guides/short-form-budget-planning' }],
      },
    ],
    faqIds: ['min-budget', 'expected-views', 'clip-cap', 'daily-limit'],
    related: ['short-form-marketing-cost', 'pay-per-view', 'for-startups'],
    updated: UPDATED,
    reviewed: REVIEWED,
  },
];
