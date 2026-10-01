import { UPDATED } from './common';
import { WITHDRAW_FROM } from './facts';
import type { Guide } from './types';

export const SITUATION_GUIDES: Guide[] = [
  {
    slug: 'side-job-office-workers',
    group: 'situation',
    title: '직장인·프리랜서가 퇴근 후에 할 만한 숏폼 부업이 있을까요?',
    description: '정해진 근무 시간 없이, 퇴근 후나 주말에 원하는 캠페인만 골라 숏폼을 올리고 조회수만큼 받는 방법이에요. 얼굴을 드러내지 않아도 돼요.',
    answer: [
      '퇴근 후나 주말에 숏폼을 편집해 올리고, 조회수만큼 받는 방법이 있어요.',
      'Clipers 캠페인은 정해진 근무 시간이 없어서 원하는 캠페인만 골라 할 수 있고, 클리핑은 얼굴을 드러내지 않아도 돼요.',
    ],
    sections: [
      {
        heading: '시간은 내가 정해요',
        paragraphs: [
          '출근도 회의도 없어요. 열려 있는 캠페인 중 하고 싶은 것만 골라 지원하고, 시간이 날 때 편집해 올리면 돼요.',
          '다만 캠페인은 예산이 다 쓰이면 끝나요. 관심 있는 캠페인은 일찍 참여하는 게 좋아요.',
        ],
      },
      {
        heading: '얼굴이 알려질 걱정이 적어요',
        paragraphs: [
          '클리핑은 정해진 영상을 편집해 올리는 일이라 얼굴이 나오지 않아요. 회사에 알려지는 게 걱정된다면 클리핑 캠페인부터 시작해 보세요.',
          '회사 취업규칙에 겸업 규정이 있다면 먼저 확인하세요.',
        ],
      },
      {
        heading: '본업과 함께 하기 좋은 단위',
        paragraphs: ['영상 하나 단위로 참여해요. 시간이 되는 만큼만 올리고, 한 캠페인에 여러 영상을 올릴 수도 있어요.'],
      },
    ],
    faqIds: ['small-channel', 'when-paid', 'per-clip-max'],
    related: ['faceless-shortform', 'video-editors', 'shorts-earnings-calculator'],
    updated: UPDATED,
  },
  {
    slug: 'side-job-stay-at-home-parents',
    group: 'situation',
    title: '전업주부·육아 중에 집에서 할 수 있는 부업이 있을까요?',
    description: '휴대폰 편집 앱으로 숏폼을 만들어 올리고 조회수만큼 받는 재택 부업이에요. 정해진 근무 시간이 없어 아이 재우고 남는 시간에 짬짬이 할 수 있어요.',
    answer: [
      '집에서 휴대폰으로 숏폼을 편집해 올리고, 조회수만큼 받는 방법이 있어요.',
      '정해진 근무 시간이 없어서 짬짬이 할 수 있고, 가입과 지원은 무료예요.',
    ],
    sections: [
      {
        heading: '휴대폰 하나로 할 수 있어요',
        paragraphs: ['휴대폰 편집 앱으로 영상을 자르고 자막을 넣은 뒤, 내 채널에 올리고 링크를 제출하면 돼요. 컴퓨터가 없어도 시작할 수 있어요.'],
      },
      {
        heading: '짬짬이 해도 괜찮아요',
        paragraphs: ['정해진 근무 시간이 없어요. 아이를 재우고 남는 시간이나 집안일 사이사이에 영상 하나씩 만들어 올리면 돼요.'],
      },
      {
        heading: '돈이 들지 않아요',
        paragraphs: [`가입과 캠페인 지원은 무료예요. 정산된 금액이 ${WITHDRAW_FROM} 이상이 되면 지급을 요청할 수 있어요.`],
      },
      {
        heading: '처음이라면',
        paragraphs: ['캠페인마다 무엇을 만들지 요구사항이 정해져 있어요. 반려되더라도 무엇을 고치면 되는지 사유를 알려 드리니, 고쳐서 다시 올리면 돼요.'],
      },
    ],
    faqIds: ['fees', 'when-paid', 'rejected'],
    related: ['faceless-shortform', 'side-job-seniors', 'what-is-clipping'],
    updated: UPDATED,
  },
  {
    slug: 'side-job-students',
    group: 'situation',
    title: '대학생·취준생이 돈 들이지 않고 할 수 있는 부업이 있을까요?',
    description: '가입비 없이, 수업과 공부 사이에 숏폼을 편집해 올리고 조회수만큼 받는 부업이에요. 올린 영상은 내 채널에 남아 편집 실력을 보여 주는 기록이 돼요.',
    answer: [
      '가입비나 장비 없이 숏폼을 편집해 올리고, 조회수만큼 받는 방법이 있어요.',
      '수업과 공부 사이 시간에 할 수 있고, 올린 영상은 내 채널에 남아요.',
    ],
    sections: [
      {
        heading: '시작하는 데 돈이 들지 않아요',
        paragraphs: ['가입과 캠페인 지원은 무료예요. 휴대폰이나 노트북의 편집 앱만 있으면 돼요.'],
      },
      {
        heading: '시간표에 맞춰 할 수 있어요',
        paragraphs: ['출근 시간이 없어서 공강이나 시험 기간을 피해 원하는 때에 영상을 올리면 돼요.'],
      },
      {
        heading: '편집 실력이 쌓여요',
        paragraphs: ['캠페인 요구사항에 맞춰 편집하다 보면 실전 경험이 쌓여요. 올린 영상은 내 채널에 남아 편집 실력을 보여 주는 기록이 돼요.'],
      },
    ],
    faqIds: ['fees', 'small-channel', 'how-much'],
    related: ['video-editors', 'what-is-clipping', 'shorts-earnings-calculator'],
    updated: UPDATED,
  },
  {
    slug: 'video-editors',
    group: 'situation',
    title: '편집 실력으로 외주 말고 수익을 낼 수 있을까요?',
    description: '클라이언트와 수정 요청을 주고받는 외주 대신, 캠페인 요구사항에 맞춰 편집해 올리고 조회수만큼 받는 방법이에요.',
    answer: [
      '캠페인 요구사항에 맞춰 편집해 내 채널에 올리고, 조회수만큼 받는 방법이 있어요.',
      '클라이언트와 시안을 주고받지 않고, 편집이 잘될수록 조회수와 함께 받는 금액도 커지는 구조예요.',
    ],
    sections: [
      {
        heading: '외주와 무엇이 다른가요',
        paragraphs: ['클라이언트와 시안과 수정 요청을 주고받지 않아요. 캠페인에 적힌 요구사항대로 편집해 올리면 운영팀이 검수해요.'],
      },
      {
        heading: '편집 실력이 금액으로 이어져요',
        paragraphs: ['받는 금액은 조회수에 따라 정해져요. 잘 만든 영상일수록 더 많이 받을 수 있어요. 다만 영상 하나로 받을 수 있는 최대 금액은 캠페인마다 달라요.'],
      },
      {
        heading: '여러 캠페인을 함께 할 수 있어요',
        paragraphs: ['캠페인마다 따로 지원하고, 승인된 캠페인이라면 동시에 여러 개를 진행할 수 있어요.'],
      },
    ],
    faqIds: ['how-much', 'per-clip-max', 'rejected'],
    related: ['side-job-students', 'existing-shorts-channels', 'what-is-clipping'],
    updated: UPDATED,
  },
  {
    slug: 'existing-shorts-channels',
    group: 'situation',
    title: '이미 쇼츠·릴스 채널을 운영 중인데 추가 수익을 낼 수 있을까요?',
    description: '운영 중인 숏폼 채널에 캠페인 영상을 올리고 조회수만큼 받는 방법이에요. 수익창출 전 채널도 참여할 수 있어요.',
    answer: [
      '운영 중인 채널에 캠페인 영상을 올리고, 그 영상의 조회수만큼 받을 수 있어요.',
      '수익창출 여부와 상관없이 참여할 수 있어서, 아직 수익창출 전인 채널에도 맞아요.',
    ],
    sections: [
      {
        heading: '내 채널이 그대로 수익원이 돼요',
        paragraphs: ['캠페인 영상은 내 채널에 올려요. 그 영상의 조회수만큼 캠페인 예산에서 받기 때문에, 플랫폼 광고 수익과 별개로 수입이 생겨요.'],
      },
      {
        heading: '채널 성격에 맞는 캠페인을 골라요',
        paragraphs: ['캠페인 둘러보기에서 분야와 플랫폼으로 골라 볼 수 있어요. 채널을 보는 사람들이 좋아할 만한 캠페인을 고르면 돼요.'],
      },
      {
        heading: '올릴 소재 걱정을 덜어요',
        paragraphs: ['캠페인마다 올릴 영상과 요구사항이 정해져 있어서, 소재가 떨어진 날에도 꾸준히 올릴 수 있어요.'],
      },
    ],
    faqIds: ['small-channel', 'platforms', 'view-check'],
    related: ['earn-before-monetization', 'platforms', 'monetization-rejected'],
    updated: UPDATED,
  },
  {
    slug: 'side-job-seniors',
    group: 'situation',
    title: '중장년·은퇴 후에 스마트폰으로 할 수 있는 일이 있을까요?',
    description: '스마트폰 편집 앱으로 숏폼을 만들어 올리고 조회수만큼 받는 일이에요. 캠페인마다 무엇을 만들지 정해져 있어 편집을 처음 배우는 분도 시작할 수 있어요.',
    answer: [
      '스마트폰 편집 앱으로 숏폼을 만들어 올리고, 조회수만큼 받는 일이 있어요.',
      '캠페인마다 무엇을 만들지 요구사항이 정해져 있어서, 편집을 처음 배우는 분도 시작할 수 있어요.',
    ],
    sections: [
      {
        heading: '스마트폰으로 할 수 있어요',
        paragraphs: ['스마트폰 편집 앱으로 영상을 자르고 자막을 넣은 뒤 올리면 돼요. 영상 링크 제출도 스마트폰으로 할 수 있어요.'],
      },
      {
        heading: '편집이 처음이어도 괜찮아요',
        paragraphs: ['캠페인에 무엇을 만들지 적혀 있어서 막막하지 않아요. 처음에는 구간을 자르고 자막을 넣는 것부터 시작해 보세요.'],
      },
      {
        heading: '반려되면 이유를 알려 드려요',
        paragraphs: ['영상이 반려되면 무엇을 고치면 되는지 사유를 알려 드려요. 고쳐서 다시 올릴 수 있고, 사유가 납득되지 않으면 이의제기를 보낼 수 있어요.'],
      },
    ],
    faqIds: ['fees', 'rejected', 'when-paid'],
    related: ['side-job-stay-at-home-parents', 'faceless-shortform', 'is-it-legit'],
    updated: UPDATED,
  },
];
