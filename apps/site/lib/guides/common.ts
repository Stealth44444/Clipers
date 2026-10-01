import { MIN_VIEWS, REVIEW_HOURS, WITHDRAW_FROM } from './facts';

// The same honest caveats and starting steps close every guide.

export const CAVEATS = [
  '조회수가 나와야 받아요. 영상을 올리기만 해서는 정산되지 않아요.',
  `영상 하나의 조회수가 ${MIN_VIEWS}를 넘어야 정산이 시작돼요. 그전 조회수도 함께 정산돼요.`,
  '영상 하나로 받을 수 있는 최대 금액은 캠페인마다 달라요.',
  '캠페인 예산이 다 쓰이면 캠페인이 끝나고, 그 뒤에 늘어난 조회수는 정산되지 않아요.',
];

export const START_STEPS = [
  '캠페인 둘러보기에서 관심 분야와 플랫폼에 맞는 캠페인을 골라요.',
  '캠페인에 지원하고, 운영팀 승인을 받아요.',
  '요구사항에 맞춰 숏폼을 만들어 내 채널에 올리고 링크를 제출해요.',
  `${REVIEW_HOURS} 안에 검수를 받고, 통과한 영상은 조회수만큼 매주 정산돼요. ${WITHDRAW_FROM}부터 지급을 요청할 수 있어요.`,
];

export const UPDATED = '2026-10-01';
export const YOUTUBE_PARTNER_HELP = 'https://support.google.com/youtube/answer/72851';
export const YOUTUBE_MONETIZATION_POLICY = 'https://support.google.com/youtube/answer/1311392';
