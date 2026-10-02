import { MIN_CAMPAIGN_BUDGET, REVIEW_SLA_OPTIONS } from '@clipers/db';

// Advertiser FAQ, shared by the brand landing (and its FAQPage data), the advertiser guides and /llms.txt.
// No per-view rate of either side: the brand rate is never public, and both together would reveal the spread.

const minBudget = `${(MIN_CAMPAIGN_BUDGET / 10_000).toLocaleString('ko-KR')}만 원`;
const hours = REVIEW_SLA_OPTIONS.map((value) => `${value}시간`).join('이나 ');

export const ADVERTISER_FAQ: { id: string; q: string; a: string }[] = [
  { id: 'min-budget', q: '최소 예산이 있나요?', a: `캠페인은 ${minBudget}부터 열 수 있어요. 금액은 부가세 별도이고, 상한은 없어요.` },
  { id: 'cost', q: '비용은 어떻게 계산되나요?', a: '검수를 통과한 영상의 검증된 조회수만큼만 예산이 쓰여요. 조회수가 나오지 않으면 예산도 쓰이지 않아요.' },
  {
    id: 'expected-views',
    q: '예산으로 조회수가 얼마나 나오나요?',
    a: '캠페인을 만들 때 예산을 넣으면 그 예산으로 받을 수 있는 최대 조회수를 바로 보여 드려요. 실제 조회수는 올라온 영상의 반응에 따라 달라지고, 그보다 적게 나오면 남은 예산은 쓰이지 않아요.',
  },
  {
    id: 'clip-cap',
    q: '영상 하나에 예산이 몰리지는 않나요?',
    a: '클립 하나가 받을 수 있는 금액에 상한을 둘 수 있어요. 또 한 크리에이터가 받을 수 있는 금액에도 상한이 있어서 예산이 여러 크리에이터에게 나뉘어요.',
  },
  {
    id: 'daily-limit',
    q: '크리에이터가 하루에 영상을 몇 개까지 올리나요?',
    a: '캠페인을 만들 때 크리에이터 1명당 하루 제출 한도를 1개, 2개, 3개, 5개, 제한 없음 중에서 고를 수 있어요. 기본은 3개예요.',
  },
  {
    id: 'budget-exhausted',
    q: '예산이 다 쓰이면 어떻게 되나요?',
    a: '검증된 조회수만큼 예산이 다 쓰이면 캠페인이 끝나요. 남은 예산은 언제든 실시간으로 확인할 수 있어요.',
  },
  {
    id: 'leftover',
    q: '다 못 쓴 예산은 어떻게 되나요?',
    a: '캠페인을 마친 뒤 상담 문의로 요청하면, 쓰지 않은 예산을 환불받거나 다음 캠페인으로 옮길 수 있어요.',
  },
  { id: 'start-time', q: '캠페인은 언제 시작되나요?', a: '캠페인을 만들고 예산을 입금하면, 운영팀이 입금을 확인한 뒤 바로 공개돼요.' },
  {
    id: 'review-time',
    q: '올라온 영상은 얼마나 빨리 검수하나요?',
    a: `캠페인을 만들 때 ${hours} 중에서 고를 수 있어요. 운영팀이 그 안에 요구사항대로인지 확인해요.`,
  },
  { id: 'creators', q: '어떤 크리에이터가 참여하나요?', a: '크리에이터는 캠페인마다 지원하고, 운영팀이 승인한 사람만 영상을 올릴 수 있어요.' },
  {
    id: 'view-verification',
    q: '조회수는 어떻게 확인하나요?',
    a: '유튜브는 조회수를 자동으로 수집하고, 다른 플랫폼은 크리에이터가 낸 화면 캡처를 운영팀이 대조해요. 짧은 시간에 비정상적으로 늘어난 조회수는 따로 확인해요.',
  },
  {
    id: 'platforms',
    q: '어떤 플랫폼을 지원하나요?',
    a: '유튜브 쇼츠, 틱톡, 인스타그램 릴스, 페이스북, X, 네이버 클립, 카카오 숏폼이에요. 캠페인마다 올릴 플랫폼을 고를 수 있어요.',
  },
  {
    id: 'music',
    q: '음원을 쓰는 음악 캠페인도 열 수 있나요?',
    a: '음원을 배경음으로 쓰는 음악 캠페인은 준비하고 있어요. 지금은 무대나 뮤직비디오 영상을 편집하는 클리핑 캠페인으로 열 수 있어요.',
  },
];

export function advertiserFaqById(id: string): { id: string; q: string; a: string } {
  const item = ADVERTISER_FAQ.find((entry) => entry.id === id);
  if (!item) throw new Error(`Unknown advertiser FAQ id: ${id}`);
  return item;
}
