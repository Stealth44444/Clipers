import { REVIEWED } from './common';
import type { Guide } from './types';

// Short-form marketing terms as Clipers uses them. Each definition is one or two sentences and quotable on its own;
// the page also emits a DefinedTermSet. No rates anywhere.

const UPDATED = '2026-10-02';

export const GLOSSARY_GUIDES: Guide[] = [
  {
    slug: 'glossary',
    audience: 'advertiser',
    group: 'glossary',
    title: '숏폼 마케팅 용어, 무엇이 있나요?',
    description: '클리핑, CPM, 검증된 조회수, UGC, 시딩, 브랜디드 콘텐츠처럼 숏폼 마케팅에서 자주 쓰는 용어를 한두 문장으로 정리했어요. 헷갈리기 쉬운 짝도 함께 풀었어요.',
    answer: [
      '숏폼 마케팅에서는 클리핑, UGC, CPM, 검증된 조회수, 시딩, 브랜디드 콘텐츠 같은 용어를 자주 써요.',
      '아래에 각 용어를 Clipers에서 쓰는 뜻으로 한두 문장씩 정리했어요.',
    ],
    sections: [
      {
        heading: '용어를 읽는 법',
        paragraphs: ['같은 용어도 서비스마다 조금씩 다르게 써요. 아래 정의는 Clipers 캠페인에서 쓰는 뜻이에요. 비용이나 정산과 관련된 용어는 캠페인 조건에서 다시 확인하세요.'],
      },
      {
        heading: '헷갈리기 쉬운 짝',
        list: [
          'CPM과 검증된 조회수: CPM은 1,000회 노출이나 조회를 기준으로 비용을 매기는 방식이고, 검증된 조회수는 그 기준이 되는 조회수를 검수와 확인을 거쳐 센 값이에요.',
          '클리핑과 UGC: 클리핑은 정해진 영상을 편집해 숏폼으로 만드는 일이고, UGC는 크리에이터가 직접 찍어 제품을 소개하는 영상이에요.',
          '시딩과 클리핑 캠페인: 시딩은 정한 사람들에게 제품이나 콘텐츠를 뿌려 퍼지게 하는 일이고, 클리핑 캠페인은 캠페인을 열어 지원한 크리에이터들이 영상을 올리게 하는 방식이에요.',
        ],
        paragraphs: ['짝을 이루는 용어는 함께 보면 차이가 잘 보여요.'],
      },
      {
        heading: '더 알아보기',
        paragraphs: ['용어를 이해했다면 숏폼 마케팅을 시작하는 방법과 비용이 정해지는 구조를 이어서 보세요.'],
        links: [
          { label: '클리핑 마케팅이란 뭔가요?', href: '/guides/clipping-marketing' },
          { label: '숏폼 마케팅 비용은 어떻게 정해지나요?', href: '/guides/short-form-marketing-cost' },
        ],
      },
    ],
    terms: [
      { term: '숏폼', definition: '유튜브 쇼츠, 인스타그램 릴스, 틱톡처럼 세로로 보는 짧은 영상이에요. 유튜브는 3분 이내의 세로·정사각형 영상을 쇼츠로 분류해요.' },
      { term: '클리핑', definition: '캠페인이 정해 준 영상(방송, 신제품 영상, 게임 플레이 등)을 잘라 자막을 넣고 순서를 바꿔 숏폼으로 편집해 올리는 일이에요.' },
      { term: '클리핑 캠페인', definition: '광고주가 영상과 예산을 맡기면 여러 크리에이터가 숏폼으로 편집해 올리고, 검증된 조회수만큼 예산이 쓰이는 캠페인이에요.' },
      { term: 'UGC', definition: 'User Generated Content의 줄임말로, 크리에이터가 직접 찍어 제품이나 서비스를 소개하는 영상이에요. Clipers에서는 소개 캠페인이라고도 불러요.' },
      { term: 'CPM', definition: 'Cost Per Mille의 줄임말로, 1,000회 노출이나 조회를 기준으로 비용을 매기는 방식이에요.' },
      { term: '검증된 조회수', definition: '검수를 통과한 영상에서 확인을 거친 조회수예요. 유튜브는 자동으로 수집하고, 다른 플랫폼은 운영팀이 영상에 표시된 조회수를 직접 확인해요.' },
      { term: '검수', definition: '올라온 영상이 요구사항, 광고 표시, 사용 허락 범위를 지켰는지 운영팀이 확인하는 과정이에요. 통과한 영상만 정산 대상이 돼요.' },
      { term: '시딩', definition: '정한 사람들에게 제품이나 콘텐츠를 나눠 주어 자연스럽게 퍼지게 하는 마케팅 방식이에요.' },
      { term: '브랜디드 콘텐츠', definition: '브랜드가 대가를 주고 크리에이터의 계정에 올리게 한 콘텐츠예요. 플랫폼마다 협찬이나 유료 파트너십을 알리는 표시 기능이 있어요.' },
      { term: '광고 표시', definition: '대가를 받은 게시물에 "광고", "유료광고", "협찬"처럼 경제적 이해관계를 잘 보이는 곳에 밝히는 일이에요.' },
      { term: '리텐션', definition: '시청자가 영상을 얼마나 오래, 끝까지 보는지를 나타내는 지표예요. 숏폼에서는 첫 몇 초가 특히 중요해요.' },
      { term: '클립당 최대 예산', definition: '영상 하나가 받을 수 있는 금액의 상한이에요. 한 영상에 예산이 몰리지 않고 여러 영상에 나뉘게 해요.' },
      { term: '하루 제출 한도', definition: '크리에이터 한 명이 하루에 한 캠페인에 올릴 수 있는 영상 수의 상한이에요. 캠페인을 만들 때 골라요.' },
      { term: '캠페인 지급 한도', definition: '한 캠페인에서 크리에이터들에게 지급될 수 있는 금액의 한도예요. 한도에 다다르면 캠페인이 끝나요.' },
    ],
    faqIds: ['cost', 'view-verification', 'clip-cap'],
    related: ['clipping-marketing', 'short-form-marketing-cost', 'clip-review-criteria'],
    updated: UPDATED,
    reviewed: REVIEWED,
  },
];
