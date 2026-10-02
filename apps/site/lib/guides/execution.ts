import { REVIEW_SLA_OPTIONS } from '@clipers/db';
import { REVIEWED } from './common';
import { MIN_BUDGET } from './facts';
import { SOURCES } from './sources';
import type { Guide } from './types';

// Running a campaign and trusting its results: the brief (in the order of the real campaign form), how clips are
// reviewed, and how ads are disclosed. Disclosure rules come from the FTC guideline page and each platform's help.

const UPDATED = '2026-10-02';
const REVIEW_CHOICES = REVIEW_SLA_OPTIONS.map((hours) => `${hours}시간`).join('이나 ');

export const EXECUTION_GUIDES: Guide[] = [
  {
    slug: 'campaign-brief-guide',
    audience: 'advertiser',
    group: 'execution',
    title: '숏폼 캠페인 브리프는 어떻게 쓰나요?',
    description: '숏폼 캠페인 브리프는 크리에이터가 보고 바로 만들 수 있게 쓰는 게 핵심이에요. 캠페인 만들기 화면의 항목 순서대로 무엇을 적으면 좋은지 정리했어요.',
    answer: [
      '좋은 브리프는 크리에이터가 다시 묻지 않고 바로 만들 수 있는 브리프예요. 꼭 보여 줄 것, 하면 안 되는 것, 참고 영상, 광고 표시 문구를 구체적으로 적으면 돼요.',
      'Clipers 캠페인 만들기 화면은 기본 정보, 콘텐츠 유형, 요구사항, 참고 링크, 플랫폼, 예산, 검수 기간 순서로 적게 돼 있어요.',
    ],
    sections: [
      {
        heading: '기본 정보와 콘텐츠 유형',
        paragraphs: [
          '캠페인 이름과 설명에는 무엇을 알리는 캠페인인지 한 줄로 적어요. 콘텐츠 유형은 정해진 영상을 편집하는 클리핑과, 크리에이터가 직접 찍어 소개하는 UGC 중에서 골라요. 클리핑이라면 원작자가 사용을 허락한 영상만 쓰도록 해요.',
        ],
      },
      {
        heading: '요구사항과 참고 링크',
        list: [
          '꼭 들어가야 할 것: 제품명, 장면, 핵심 문구, 끝맺는 화면',
          '하면 안 되는 것: 경쟁사 언급, 과장된 효능 표현, 허락하지 않은 음악',
          '광고 표시: "광고"나 "유료광고"를 영상 시작과 설명 첫 줄에 넣기',
          '참고 링크: 원하는 분위기의 영상이나 원본 영상 주소',
        ],
        paragraphs: ['요구사항이 구체적일수록 검수에서 반려되는 영상이 줄어요.'],
      },
      {
        heading: '플랫폼과 예산',
        paragraphs: [
          `올릴 플랫폼을 고르고, 총예산을 넣어요(${MIN_BUDGET}부터, 부가세 별도). 클립당 최대 예산을 정하면 한 영상에 예산이 몰리지 않고, 크리에이터 1명당 하루 제출 한도로 참여를 고르게 나눌 수 있어요.`,
        ],
        links: [{ label: '숏폼 캠페인 예산은 얼마로 잡아야 하나요?', href: '/guides/short-form-budget-planning' }],
      },
      {
        heading: '검수 기간',
        paragraphs: [`검수 기간은 ${REVIEW_CHOICES} 중에서 골라요. 운영팀이 그 안에 요구사항대로인지 확인하고, 통과한 영상만 정산 대상이 돼요.`],
        links: [{ label: '올라온 숏폼은 무엇을 기준으로 검수하나요?', href: '/guides/clip-review-criteria' }],
      },
    ],
    faqIds: ['start-time', 'review-time', 'daily-limit', 'clip-cap'],
    related: ['clip-review-criteria', 'ad-disclosure-rules', 'short-form-budget-planning'],
    updated: UPDATED,
    reviewed: REVIEWED,
  },
  {
    slug: 'clip-review-criteria',
    audience: 'advertiser',
    group: 'execution',
    title: '올라온 숏폼은 무엇을 기준으로 검수하나요?',
    description: '클리핑 캠페인에 올라온 영상은 운영팀이 요구사항, 광고 표시, 사용 허락 범위를 기준으로 검수해요. 통과·반려 기준과 반려될 때 일어나는 일을 정리했어요.',
    answer: [
      '운영팀은 캠페인 요구사항대로 만들었는지, 광고 표시가 있는지, 허락된 영상만 썼는지를 기준으로 검수해요.',
      '통과한 영상만 정산 대상이 되고, 반려할 때는 크리에이터에게 반드시 사유를 알려요.',
    ],
    sections: [
      {
        heading: '검수 기준',
        list: [
          '요구사항: 꼭 넣을 장면과 문구, 하면 안 되는 표현을 지켰는지',
          '광고 표시: "광고"나 "유료광고" 같은 표시가 잘 보이는 곳에 있는지',
          '사용 허락: 클리핑 캠페인이라면 허락된 원본 영상만 썼는지',
          '플랫폼: 캠페인에서 고른 플랫폼에 올렸는지',
        ],
        paragraphs: ['기준은 캠페인을 만들 때 적은 요구사항이 바탕이에요.'],
      },
      {
        heading: '검수 시간',
        paragraphs: [`캠페인마다 ${REVIEW_CHOICES} 중에서 정한 시간 안에 운영팀이 검수해요. 시간이 지나도록 검수되지 않은 영상은 운영팀에 따로 알림이 가요.`],
      },
      {
        heading: '반려되면',
        paragraphs: [
          '반려할 때는 크리에이터에게 사유를 알려요. 크리에이터는 영상을 고쳐 다시 올리거나, 판단에 동의하지 않으면 이의제기를 보낼 수 있고 운영팀이 다시 확인해요.',
        ],
      },
      {
        heading: '통과한 뒤',
        paragraphs: ['통과한 영상의 조회수를 매주 확인해 예산에서 차감해요. 짧은 시간에 비정상적으로 늘어난 조회수는 정산 전에 따로 확인해요.'],
        links: [{ label: '숏폼 바이럴 조회수, 믿을 수 있나요?', href: '/guides/verified-views' }],
      },
    ],
    faqIds: ['review-time', 'view-verification', 'creators'],
    related: ['campaign-brief-guide', 'ad-disclosure-rules', 'verified-views'],
    updated: UPDATED,
    reviewed: REVIEWED,
  },
  {
    slug: 'ad-disclosure-rules',
    audience: 'advertiser',
    group: 'execution',
    title: '숏폼 광고 표시는 어떻게 해야 하나요?',
    description: '대가를 주고 받은 숏폼에는 경제적 이해관계를 표시해야 해요. 공정거래위원회 기준의 표시 위치와 문구, 유튜브·틱톡·메타의 표시 기능을 출처와 함께 정리했어요.',
    answer: [
      '대가를 받고 올리는 숏폼에는 "광고", "유료광고", "협찬"처럼 경제적 이해관계를 제목이나 영상 시작처럼 잘 보이는 곳에 표시해야 해요.',
      '"AD", "체험단" 같은 표현이나 댓글·더보기 안의 표시는 알아보기 어려워 적절하지 않다고 안내돼 있어요.',
    ],
    sections: [
      {
        heading: '어디에, 어떻게',
        list: [
          '위치: 영상 제목, 영상 시작 화면, 설명 첫 부분처럼 바로 보이는 곳',
          '문구: "광고", "유료광고", "협찬", 또는 받은 혜택을 구체적으로("할인 지원" 등)',
          '피할 것: 댓글이나 더보기 안에만 표시, "AD"·"PR" 같은 영어 약어, "체험단"',
          '영상 전체가 광고라면: 시작과 끝, 그리고 중간중간 반복해서 표시',
        ],
        paragraphs: ['찾기쉬운 생활법령정보가 공정거래위원회의 추천·보증 심사지침을 바탕으로 이렇게 안내해요.'],
      },
      {
        heading: '플랫폼의 표시 기능',
        paragraphs: [
          '유튜브는 "유료 프로모션 포함" 설정을 켜면 영상 시작 10초 동안 공개 메시지를 보여 줘요. 틱톡은 브랜드를 홍보하는 영상에 상업 콘텐츠 공개 설정을 켜야 하고, 다른 회사의 브랜드를 홍보하면 "Paid partnership" 표시가 붙어요. 메타는 인스타그램과 페이스북에 협찬 광고 레이블 기능을 두고 있어요.',
          '플랫폼 기능을 켜더라도 영상 안이나 설명 첫 부분의 표시는 따로 하는 게 안전해요.',
        ],
      },
      {
        heading: 'Clipers 캠페인에서는',
        paragraphs: ['캠페인 요구사항에 표시 문구와 위치를 적어 두면, 운영팀이 검수할 때 광고 표시가 있는지 함께 확인해요. 표시가 없으면 반려될 수 있어요.'],
        links: [{ label: '올라온 숏폼은 무엇을 기준으로 검수하나요?', href: '/guides/clip-review-criteria' }],
      },
      {
        heading: '알아두세요',
        paragraphs: ['이 글은 공개된 안내를 정리한 것이고 법률 자문이 아니에요. 캠페인 성격에 따라 판단이 달라질 수 있으니 필요하면 전문가와 확인하세요.'],
      },
    ],
    faqIds: ['review-time', 'creators', 'platforms'],
    related: ['clip-review-criteria', 'campaign-brief-guide', 'youtube-shorts-marketing'],
    updated: UPDATED,
    reviewed: REVIEWED,
    sources: [SOURCES.adDisclosure, SOURCES.youtubePaidPromotion, SOURCES.tiktokDisclosure, SOURCES.metaPaidPartnership],
  },
];
