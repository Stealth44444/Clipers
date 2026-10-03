import { REVIEWED } from './common';
import type { Guide, GuideSource } from './types';

// Korean short-form usage in numbers. Every figure comes from a government-approved survey's own release, read on the
// date below; a figure that could not be found in the release itself (for example an overall usage rate quoted only by
// news coverage) is left out. Interpretation stays with what the numbers say directly.

const UPDATED = '2026-10-03';
const checked = '2026-10-03';

const sources: GuideSource[] = [
  {
    label: '방송미디어통신위원회 — 2025 방송매체 이용행태조사 결과 발표 (2025. 12. 30.)',
    url: 'https://www.kmcc.go.kr/user.do?boardId=1113&page=A05030000&dc=K00000200&boardSeq=67869&mode=view',
    checked,
  },
  {
    label: '한국콘텐츠진흥원 — 2025 콘텐츠 이용행태 조사 국가승인통계 보고서 발간 (2025. 12. 15.)',
    url: 'https://www.kocca.kr/kocca/koccanews/reportview.do?menuNo=204767&nttNo=1067',
    checked,
  },
];

export const DATA_GUIDES: Guide[] = [
  {
    slug: 'korea-short-form-usage',
    audience: 'advertiser',
    group: 'data',
    title: '국내 숏폼 이용, 숫자로 보면 어떤가요?',
    description: '정부 승인 통계로 본 국내 숏폼 이용 현황이에요. 스마트폰으로 숏폼을 자주 보는 비율, 숏폼을 보는 플랫폼, 보는 이유, 쇼핑 링크 반응을 출처와 함께 정리했어요.',
    answer: [
      '2025 방송매체 이용행태조사에서 스마트폰으로 주 5일 이상 숏폼을 보는 사람은 42.7%였어요.',
      '2025 콘텐츠 이용행태 조사에서 숏폼을 보는 플랫폼은 유튜브 쇼츠가 93.4%로 가장 많았고, 인스타그램 릴스 30.9%, 틱톡 21.1%, 네이버 클립 6.7% 순이었어요.',
    ],
    sections: [
      {
        heading: '두 조사를 읽는 법',
        paragraphs: [
          '방송미디어통신위원회의 2025 방송매체 이용행태조사는 전국 5,566가구, 13세 이상 8,320명을 대면 조사했어요. 문화체육관광부와 한국콘텐츠진흥원의 2025 콘텐츠 이용행태 조사는 전국 10세 이상 6,554명을 7월부터 약 3개월 동안 대면 면접으로 조사한 국가승인통계예요.',
          '두 조사는 묻는 방식과 대상이 달라서 숫자를 서로 바로 비교하지 않는 게 좋아요.',
        ],
      },
      {
        heading: '광고주에게 의미하는 것',
        paragraphs: [
          '숏폼을 보는 사람 대부분이 유튜브 쇼츠를 보고, 여러 플랫폼을 함께 쓰는 사람도 많아요(플랫폼별 비율의 합이 100%를 넘어요). 한 플랫폼만 고르기보다 유튜브 쇼츠를 중심에 두고 다른 플랫폼을 함께 고르는 구성을 검토해 볼 수 있어요.',
          '숏폼 이용자 세 명 중 한 명꼴로 영상 속 쇼핑 링크에 들어가 봤다고 답했어요. 제품 캠페인이라면 설명란 링크를 요구사항에 함께 적어 두세요.',
        ],
        links: [
          { label: '유튜브 쇼츠 마케팅은 어떻게 하나요?', href: '/guides/youtube-shorts-marketing' },
          { label: '숏폼 캠페인 브리프는 어떻게 쓰나요?', href: '/guides/campaign-brief-guide' },
        ],
      },
      {
        heading: '앞으로',
        paragraphs: ['출시 후 캠페인 데이터가 쌓이면, 플랫폼별 조회수 흐름처럼 Clipers 캠페인에서 나온 숫자도 같은 방식으로 출처와 함께 공개할 예정이에요.'],
      },
    ],
    rows: [
      { label: '스마트폰으로 주 5일 이상 숏폼을 보는 비율 (13세 이상)', value: '42.7%', source: 0 },
      { label: '같은 기준, SNS·메신저 / 뉴스·정보', value: '79.4% / 63.4%', source: 0 },
      { label: '숏폼을 보는 플랫폼 (복수 응답)', value: '유튜브 쇼츠 93.4%, 인스타그램 릴스 30.9%, 틱톡 21.1%, 네이버 클립 6.7%', source: 1 },
      { label: '숏폼을 보는 이유 (상위 3개)', value: '짧아서 부담이 없어서 76.0%, 재미있는 부분만 보려고 51.4%, 추천 알고리즘 때문 47.0%', source: 1 },
      { label: '숏폼 이용자 중 영상 속 쇼핑 링크에 들어가 본 비율', value: '33.3% (그중 실제 구매 31.4%)', source: 1 },
    ],
    faqIds: ['platforms', 'cost', 'creators'],
    related: ['youtube-shorts-marketing', 'naver-clip-marketing', 'campaign-brief-guide'],
    updated: UPDATED,
    reviewed: REVIEWED,
    sources,
  },
];
