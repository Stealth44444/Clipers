import { MIN_BUDGET, MIN_VIEWS, REVIEW_HOURS, WITHDRAW_FROM } from './facts';

// Short shared blocks that close every guide: two lines each, so each guide's own answer stays the bulk of the page.

export const CAVEATS = [
  `조회수가 나와야 받고, 영상 하나의 조회수가 ${MIN_VIEWS}를 넘어야 정산이 시작돼요.`,
  '영상 하나와 한 사람이 한 캠페인에서 받을 수 있는 금액에는 상한이 있고, 캠페인 지급 한도에 다다르면 캠페인이 끝나요.',
];

export const START_STEPS = [
  '캠페인을 골라 지원하고, 승인되면 요구사항대로 만들어 내 채널에 올린 뒤 링크를 제출해요.',
  `${REVIEW_HOURS} 안에 검수를 받고, 통과한 영상은 조회수만큼 매주 정산돼요. ${WITHDRAW_FROM}부터 지급을 요청할 수 있어요.`,
];

export const ADVERTISER_NOTES = [
  `캠페인은 ${MIN_BUDGET}(부가세 별도)부터 열 수 있고, 검증된 조회수만큼만 예산이 쓰여요.`,
  '캠페인을 만들 때 예산을 넣으면 그 예산으로 받을 수 있는 최대 조회수를 바로 확인할 수 있어요.',
];

export const UPDATED = '2026-10-01';
/** Facts in every guide were checked against the product and their sources on this day. */
export const REVIEWED = '2026-10-02';
export const YOUTUBE_PARTNER_HELP = 'https://support.google.com/youtube/answer/72851';
export const YOUTUBE_MONETIZATION_POLICY = 'https://support.google.com/youtube/answer/1311392';
