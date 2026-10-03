import { REVIEWED } from './common';
import { MIN_BUDGET } from './facts';
import type { Guide } from './types';

// The advertiser hub: one page that answers "how do I start short-form marketing" and links every stage of the
// question map (platform, compare, cost, industry, execution, glossary, data).

const UPDATED = '2026-10-03';

export const PILLAR_GUIDES: Guide[] = [
  {
    slug: 'short-form-marketing',
    audience: 'advertiser',
    group: 'pillar',
    title: '숏폼 마케팅, 어떻게 시작하면 되나요?',
    description: '숏폼 마케팅을 처음 시작하는 광고주를 위한 안내예요. 광고 집행·인플루언서·클리핑 캠페인 중 고르는 법, 플랫폼과 예산을 정하는 순서를 한 페이지에 정리했어요.',
    answer: [
      '숏폼 마케팅은 유튜브 쇼츠, 인스타그램 릴스, 틱톡 같은 짧은 세로 영상으로 브랜드를 알리는 일이에요. 방법은 크게 광고 집행, 인플루언서 섭외, 클리핑 캠페인 세 가지예요.',
      '세 방법은 비용이 생기는 곳이 달라요. 광고는 노출에, 인플루언서는 게시물에, 클리핑 캠페인은 검증된 조회수에 비용을 내요.',
    ],
    sections: [
      {
        heading: '세 가지 방법',
        list: [
          '광고 집행: 플랫폼에 비용을 내고 브랜드 계정의 광고 영상을 노출해요. 대상과 기간을 정밀하게 정할 수 있어요.',
          '인플루언서 섭외: 정한 인플루언서에게 게시물 단위로 비용을 내요. 한 사람의 신뢰와 이미지를 빌려요.',
          '클리핑 캠페인: 캠페인을 열면 여러 크리에이터가 지원해 각자 다른 버전의 숏폼을 올리고, 검증된 조회수만큼만 예산이 쓰여요.',
        ],
        paragraphs: ['어느 하나만 고를 필요는 없고, 목적에 따라 섞어 쓸 수 있어요.'],
        links: [
          { label: '인플루언서 마케팅과 클리핑 캠페인 비교', href: '/guides/clipers-vs-influencer-marketing' },
          { label: '숏폼 유료 광고와 클리핑 캠페인 비교', href: '/guides/clipers-vs-short-form-ads' },
          { label: '클리핑 마케팅이란 뭔가요?', href: '/guides/clipping-marketing' },
        ],
      },
      {
        heading: '목적부터 정해요',
        paragraphs: [
          '알리고 싶은 게 이미 있는 영상(방송, 뮤직비디오, 게임 플레이)이라면 클리핑 캠페인으로 여러 버전을 퍼뜨리는 게 맞아요. 새 제품을 보여 줘야 한다면 크리에이터가 직접 찍는 UGC를 고르고, 특정 인물의 신뢰가 필요하다면 인플루언서 섭외를 검토해요. 업종별 가이드에서 비슷한 사례를 찾아보세요.',
        ],
        links: [
          { label: '신제품을 숏폼으로 빠르게 알리려면', href: '/guides/for-brands' },
          { label: '롱폼 영상을 숏폼으로 재활용하려면', href: '/guides/repurpose-longform' },
        ],
      },
      {
        heading: '플랫폼을 골라요',
        paragraphs: ['플랫폼마다 형식과 광고 표시 기능이 달라요. 공식 조사에서는 숏폼을 보는 사람 대부분이 유튜브 쇼츠를 보고, 여러 플랫폼을 함께 보는 사람도 많았어요.'],
        links: [
          { label: '유튜브 쇼츠 마케팅', href: '/guides/youtube-shorts-marketing' },
          { label: '인스타그램 릴스 마케팅', href: '/guides/instagram-reels-marketing' },
          { label: '틱톡 마케팅', href: '/guides/tiktok-marketing' },
          { label: '국내 숏폼 이용, 숫자로 보면', href: '/guides/korea-short-form-usage' },
        ],
      },
      {
        heading: '예산을 정해요',
        paragraphs: [
          `Clipers 캠페인은 ${MIN_BUDGET}(부가세 별도)부터 열 수 있어요. 캠페인을 만들 때 예산을 넣으면 그 예산으로 받을 수 있는 최대 조회수가 바로 보여서, 숫자를 보며 조정하면 돼요.`,
        ],
        links: [
          { label: '숏폼 마케팅 비용은 어떻게 정해지나요?', href: '/guides/short-form-marketing-cost' },
          { label: '숏폼 캠페인 예산은 얼마로 잡아야 하나요?', href: '/guides/short-form-budget-planning' },
        ],
      },
      {
        heading: '시작하는 순서',
        list: [
          '캠페인을 만들고 브리프(요구사항, 참고 링크, 광고 표시 문구)를 적어요.',
          '예산을 입금하면 운영팀이 확인한 뒤 캠페인이 공개돼요.',
          '크리에이터가 지원하고, 승인된 크리에이터가 영상을 올리면 운영팀이 검수해요.',
          '통과한 영상의 검증된 조회수만큼 매주 예산에서 차감돼요.',
        ],
        paragraphs: ['처음이라 용어가 낯설다면 용어집부터 보세요.'],
        links: [
          { label: '숏폼 캠페인 브리프는 어떻게 쓰나요?', href: '/guides/campaign-brief-guide' },
          { label: '숏폼 광고 표시는 어떻게 해야 하나요?', href: '/guides/ad-disclosure-rules' },
          { label: '숏폼 마케팅 용어', href: '/guides/glossary' },
        ],
      },
    ],
    faqIds: ['cost', 'min-budget', 'platforms', 'creators'],
    related: ['clipping-marketing', 'short-form-marketing-cost', 'clipers-vs-influencer-marketing'],
    updated: UPDATED,
    reviewed: REVIEWED,
  },
];
