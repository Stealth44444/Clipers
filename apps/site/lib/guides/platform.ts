import { UPDATED } from './common';
import type { Guide } from './types';

export const PLATFORM_GUIDES: Guide[] = [
  {
    slug: 'platforms',
    audience: 'creator',
    group: 'platform',
    title: '쇼츠·릴스·틱톡, 어느 플랫폼에 올려도 돈을 받을 수 있나요?',
    description: '유튜브 쇼츠, 틱톡, 인스타그램 릴스, 페이스북, X, 네이버 클립, 카카오 숏폼에 올린 영상의 조회수만큼 받을 수 있어요. 플랫폼별 조회수 확인 방법을 정리했어요.',
    answer: [
      '네. 플랫폼 자체의 수익화 조건과 상관없이, 캠페인에 참여해 올린 영상의 조회수만큼 받을 수 있어요.',
      '유튜브 쇼츠, 틱톡, 인스타그램 릴스, 페이스북, X, 네이버 클립, 카카오 숏폼에 올릴 수 있고, 캠페인마다 올릴 수 있는 플랫폼이 정해져 있어요.',
    ],
    sections: [
      {
        heading: '유튜브 쇼츠',
        paragraphs: ['영상 링크를 제출하면 조회수를 자동으로 가져와요.'],
      },
      {
        heading: '틱톡 · 인스타그램 릴스 · 페이스북',
        paragraphs: ['영상 링크를 제출하면 운영팀이 영상에 표시된 조회수를 직접 확인해요.'],
      },
      {
        heading: 'X · 네이버 클립 · 카카오 숏폼',
        paragraphs: ['같은 방식이에요. 링크를 제출하면 운영팀이 영상에 표시된 조회수를 직접 확인해요.'],
      },
      {
        heading: '어느 플랫폼부터 시작할까요',
        paragraphs: ['캠페인마다 올릴 수 있는 플랫폼이 달라요. 캠페인 둘러보기에서 내가 쓰는 플랫폼으로 골라 볼 수 있어요.'],
        links: [{ label: '캠페인 둘러보기', href: '/discover' }],
      },
    ],
    faqIds: ['platforms', 'view-check', 'min-views'],
    related: ['shorts-earnings-calculator', 'existing-shorts-channels', 'earn-before-monetization'],
    updated: UPDATED,
  },
];
