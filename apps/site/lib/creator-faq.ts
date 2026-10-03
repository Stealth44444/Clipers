import { DEFAULT_PRICING } from '@clipers/db';
import { formatKRW } from '@clipers/ui';

// Creator FAQ, shared by the creator landing (and its FAQPage structured data) and /llms.txt so the two never drift.
// Creator rate only: the brand rate is never public.

const rate = DEFAULT_PRICING.creatorCpm;

export const CREATOR_FAQ: { id: string; q: string; a: string }[] = [
  { id: 'what-is-clipping', q: '클리핑이 뭔가요?', a: '캠페인이 정해 준 영상을 내 방식대로 편집해 숏폼으로 올리는 일이에요. 올린 영상의 조회수만큼 정산돼요.' },
  {
    id: 'small-channel',
    q: '구독자가 적거나 새 채널이어도 되나요?',
    a: '네. 구독자 수나 수익창출 여부와 상관없이 누구나 지원할 수 있어요. 캠페인마다 운영팀이 지원을 확인한 뒤 승인해요.',
  },
  { id: 'others-videos', q: '남의 영상을 올려도 괜찮은가요?', a: '클리핑 캠페인은 원작자가 사용을 허락한 영상만 다뤄요. 캠페인에 적힌 요구사항에 맞춰 편집해 주세요.' },
  { id: 'fees', q: '가입비나 지원 비용이 있나요?', a: '없어요. 가입과 캠페인 지원은 무료예요.' },
  {
    id: 'how-much',
    q: '얼마를 받나요?',
    a: `캠페인마다 조회수 1천 회당 받는 금액이 먼저 공개돼요. 검수를 통과한 영상의 검증된 조회수에 그 금액을 곱해 정산돼요. 예를 들어 1천 회당 ${formatKRW(rate)}인 캠페인이라면, 조회수 10만 회에 ${formatKRW(rate * 100)}이에요.`,
  },
  {
    id: 'per-clip-max',
    q: '영상 하나로 얼마까지 받을 수 있나요?',
    a: '영상 하나로 받을 수 있는 최대 금액은 캠페인마다 달라요. 지원하기 전에 캠페인 상세에서 확인할 수 있어요. 또 한 사람이 한 캠페인에서 받을 수 있는 금액에도 상한이 있어서, 여러 크리에이터가 고르게 받을 수 있어요.',
  },
  {
    id: 'daily-limit',
    q: '하루에 영상을 몇 개까지 올릴 수 있나요?',
    a: '캠페인마다 크리에이터 한 명이 하루에 올릴 수 있는 영상 수가 정해져 있어요. 캠페인 상세에서 확인할 수 있고, 반려된 영상은 세지 않아요.',
  },
  {
    id: 'min-views',
    q: '조회수가 얼마나 나와야 정산되나요?',
    a: '영상 하나의 조회수가 1,000회를 넘으면 그전 조회수까지 모두 정산되고, 이후 늘어난 조회수도 매주 이어서 정산돼요.',
  },
  {
    id: 'budget-runs-out',
    q: '캠페인 지급 한도에 다다르면 어떻게 되나요?',
    a: '캠페인마다 크리에이터에게 지급할 수 있는 한도가 있어요. 한도에 다다르면 캠페인이 끝나고, 그 뒤에 늘어난 조회수는 정산되지 않아요. 남은 지급 한도는 캠페인마다 확인할 수 있어요.',
  },
  { id: 'when-paid', q: '언제 돈을 받을 수 있나요?', a: '정산된 금액이 3,000원 이상이면 지급을 요청할 수 있어요.' },
  {
    id: 'platforms',
    q: '어떤 플랫폼에 올리면 되나요?',
    a: '유튜브 쇼츠, 틱톡, 인스타그램 릴스, 페이스북, X, 네이버 클립, 카카오 숏폼이에요. 캠페인마다 올릴 수 있는 플랫폼이 정해져 있어요.',
  },
  {
    id: 'which-videos',
    q: '어떤 영상을 제출할 수 있나요?',
    a: "인증한 내 계정에 캠페인이 공개된 뒤 공개로 올린 영상만 제출할 수 있어요. 먼저 설정의 '내 채널'에서 계정을 등록하고, 안내받은 인증 코드를 채널 설명이나 프로필 소개에 넣어 인증해 주세요. 유튜브는 바로 자동으로 인증되고, 다른 플랫폼은 운영팀이 확인한 뒤부터 제출할 수 있어요. 올린 영상을 삭제하거나 비공개로 바꾸면 그 주부터 정산이 멈춰요.",
  },
  { id: 'view-check', q: '조회수는 어떻게 확인하나요?', a: '유튜브는 조회수를 자동으로 가져오고, 다른 플랫폼은 운영팀이 영상에 표시된 조회수를 직접 확인해요.' },
  {
    id: 'rejected',
    q: '검수에서 반려되면 어떻게 하나요?',
    a: 'Clipers는 처음 시작하는 크리에이터도 최대한 많이 함께하고 싶어요. 그래서 반려할 때는 무엇을 고치면 되는지 사유를 분명하게 알려 드려요. 사유에 맞춰 고친 영상을 다시 올릴 수 있고, 사유가 납득되지 않으면 이의제기를 보낼 수 있어요.',
  },
];

export function faqById(id: string): { id: string; q: string; a: string } {
  const item = CREATOR_FAQ.find((entry) => entry.id === id);
  if (!item) throw new Error(`Unknown FAQ id: ${id}`);
  return item;
}
