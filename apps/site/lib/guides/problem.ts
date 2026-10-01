import { COMPANY } from '../company';
import { UPDATED, YOUTUBE_MONETIZATION_POLICY } from './common';
import { MIN_VIEWS, RATE, WITHDRAW_FROM } from './facts';
import type { Guide } from './types';

export const PROBLEM_GUIDES: Guide[] = [
  {
    slug: 'fan-edits',
    group: 'problem',
    title: '좋아하는 아이돌·스트리머 영상으로 돈을 벌 수 있을까요?',
    description: '아티스트나 스트리머가 직접 캠페인을 열면, 그 영상을 편집해 올리고 조회수만큼 받을 수 있어요. 팬 편집을 수익으로 잇는 방법과 주의할 점을 정리했어요.',
    answer: [
      '아티스트나 스트리머(또는 소속사·레이블)가 직접 캠페인을 열었다면, 그 영상을 편집해 올리고 조회수만큼 받을 수 있어요.',
      '허락 없이 올리는 팬 편집과 달리, 캠페인 영상은 원작자가 사용을 허락한 영상이에요.',
    ],
    sections: [
      {
        heading: '팬 편집이 수익이 되는 경우',
        paragraphs: ['좋아하는 아티스트나 스트리머의 캠페인이 열려 있을 때만 가능해요. 캠페인 둘러보기에서 지금 열린 캠페인을 확인해 보세요.'],
      },
      {
        heading: '허락 없는 팬 편집과의 차이',
        paragraphs: ['Clipers에서 정산되는 건 캠페인에 참여해 올린 영상뿐이에요. 허락 없이 올린 편집 영상은 정산 대상이 아니에요.'],
      },
      {
        heading: '하던 편집 그대로',
        paragraphs: ['직캠을 자르고, 자막을 넣고, 명장면을 이어 붙이던 편집 실력을 그대로 쓰면 돼요. 캠페인 요구사항만 지키면 나머지는 자유예요.'],
      },
    ],
    faqIds: ['others-videos', 'what-is-clipping', 'how-much'],
    related: ['what-is-clipping', 'copyright-safe-clipping', 'video-editors'],
    updated: UPDATED,
  },
  {
    slug: 'monetization-rejected',
    group: 'problem',
    title: '유튜브 수익창출이 거절됐어요, 다른 방법이 있을까요?',
    description: '유튜브 수익창출 심사와 별개로, 캠페인에 참여해 올린 숏폼의 조회수만큼 받는 방법이 있어요. 수익창출이 거절된 채널도 지원할 수 있어요.',
    answer: [
      '유튜브 수익창출과 별개로, 캠페인에 참여해 숏폼을 올리고 조회수만큼 받는 방법이 있어요.',
      '이 돈은 캠페인 예산에서 나오기 때문에, 수익창출이 거절된 채널도 캠페인에 지원할 수 있어요.',
    ],
    sections: [
      {
        heading: '거절 사유부터 확인하세요',
        paragraphs: ['유튜브는 재사용된 콘텐츠 등 여러 이유로 수익창출을 거절할 수 있어요. 다시 신청하려면 유튜브 안내를 따르는 게 가장 정확해요.'],
        links: [{ label: '유튜브 채널 수익 창출 정책 보기 (유튜브 고객센터)', href: YOUTUBE_MONETIZATION_POLICY }],
      },
      {
        heading: '수익창출과 별개로 받는 돈',
        paragraphs: [`캠페인에 참여해 올린 영상은 조회수만큼 캠페인 예산에서 받아요. 1천 회당 ${RATE}인 캠페인이라면 영상 하나가 ${MIN_VIEWS}를 넘는 순간부터 정산돼요.`],
      },
      {
        heading: '알아둘 점',
        paragraphs: ['Clipers는 캠페인 예산으로 정산할 뿐, 유튜브 수익창출 심사에는 영향을 주지 않아요. 클리핑 영상이 유튜브 수익창출 대상이 되는지는 유튜브 정책에 따라요.'],
      },
    ],
    faqIds: ['small-channel', 'how-much', 'view-check'],
    related: ['earn-before-monetization', 'existing-shorts-channels', 'is-it-legit'],
    updated: UPDATED,
  },
  {
    slug: 'is-it-legit',
    group: 'problem',
    title: '조회수 부업, 믿을 수 있는 곳은 어떻게 고르나요?',
    description: '조회수로 돈을 주는 부업을 고를 때 확인할 다섯 가지 기준과, Clipers가 각 기준을 어떻게 지키는지 정리했어요.',
    answer: [
      '가입비를 받는지, 받을 금액을 미리 공개하는지, 지급 기준이 분명한지, 반려 사유를 알려 주는지, 운영 회사 정보를 공개하는지 확인하세요.',
      'Clipers는 가입비가 없고, 1천 회당 금액과 지급 기준을 미리 공개해요.',
    ],
    sections: [
      {
        heading: '가입비나 교육비를 먼저 요구하지 않나요',
        paragraphs: ['돈을 벌게 해 준다며 먼저 돈을 받는 곳은 조심하세요. Clipers는 가입과 캠페인 지원이 무료예요.'],
      },
      {
        heading: '받을 금액을 미리 공개하나요',
        paragraphs: ['Clipers는 캠페인마다 조회수 1천 회당 받는 금액을 지원하기 전에 공개해요.'],
      },
      {
        heading: '지급 기준이 분명한가요',
        paragraphs: [`영상 하나의 조회수가 ${MIN_VIEWS}를 넘으면 정산이 시작되고, 매주 정산돼요. 정산된 금액이 ${WITHDRAW_FROM} 이상이면 지급을 요청할 수 있어요.`],
      },
      {
        heading: '반려되면 이유를 알려 주나요',
        paragraphs: ['Clipers는 반려할 때 사유를 알려 드리고, 사유가 납득되지 않으면 이의제기를 보낼 수 있어요.'],
      },
      {
        heading: '운영 회사를 확인할 수 있나요',
        paragraphs: [`Clipers는 대표 ${COMPANY.representative}, 사업자등록번호 ${COMPANY.registrationNumber}로 운영돼요. 모든 페이지 하단에서 회사 정보를 확인할 수 있어요.`],
      },
    ],
    faqIds: ['fees', 'when-paid', 'rejected'],
    related: ['shorts-earnings-calculator', 'what-is-clipping', 'monetization-rejected'],
    updated: UPDATED,
  },
  {
    slug: 'copyright-safe-clipping',
    group: 'problem',
    title: '쇼츠 짜깁기, 저작권 괜찮을까요?',
    description: '허락 없이 남의 영상을 잘라 올리면 저작권 문제가 생길 수 있어요. 원작자가 허락한 영상으로 클리핑하는 방법을 정리했어요.',
    answer: [
      '허락 없이 남의 영상을 잘라 올리면 저작권 침해 신고나 채널 경고를 받을 수 있어요.',
      'Clipers의 클리핑 캠페인은 원작자가 사용을 허락한 영상만 다뤄요.',
    ],
    sections: [
      {
        heading: '허락 없는 짜깁기의 위험',
        paragraphs: ['방송이나 다른 크리에이터의 영상을 허락 없이 올리면 저작권 침해 신고를 받거나, 영상이 내려가거나, 채널에 경고가 쌓일 수 있어요.'],
      },
      {
        heading: '허락받은 영상으로 하는 방법',
        paragraphs: ['클리핑 캠페인은 원작자가 사용을 허락한 영상으로 열려요. 캠페인에 참여해 그 영상을 편집해 올리면 돼요.'],
      },
      {
        heading: '그래도 지켜야 할 것',
        paragraphs: ['캠페인에 적힌 요구사항과 사용 범위를 지켜 주세요. 이 안내는 법률 자문이 아니에요. 개별 상황은 전문가와 확인하세요.'],
      },
    ],
    faqIds: ['others-videos', 'what-is-clipping', 'rejected'],
    related: ['what-is-clipping', 'fan-edits', 'monetization-rejected'],
    updated: UPDATED,
  },
];
