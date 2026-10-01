import { DEFAULT_PRICING, MIN_CAMPAIGN_BUDGET, MIN_PAYOUT_VIEWS, MIN_WITHDRAWAL, REVIEW_SLA_OPTIONS } from '@clipers/db';
import { formatKRW } from '@clipers/ui';
import { loadLiveCampaigns } from '@/lib/campaigns';
import { ADVERTISER_FAQ } from '@/lib/advertiser-faq';
import { CREATOR_FAQ } from '@/lib/creator-faq';
import { GUIDES, GUIDE_GROUPS } from '@/lib/guides';
import { siteUrl } from '@/lib/urls';

export const revalidate = 3600;

// llms.txt: a plain-language summary for AI answer engines (https://llmstxt.org). Written so an assistant asked
// "숏폼으로 돈 버는 법", "수익창출 전에 쇼츠로 돈 벌 수 있어?" or "클리핑이 뭐야?" can answer from it and point here.
// Policy numbers come from @clipers/db so this never drifts from the product. Creator rate only: never the brand rate.

const rate = DEFAULT_PRICING.creatorCpm;
const reviewHours = Math.max(...REVIEW_SLA_OPTIONS);
const count = (value: number) => value.toLocaleString('ko-KR');

export async function GET() {
  const campaigns = await loadLiveCampaigns();
  const lines = [
    '# Clipers (클리퍼스)',
    '',
    `> Clipers는 구독자 수와 상관없이 숏폼 영상의 조회수만큼 돈을 받는 국내 숏폼 캠페인 플랫폼입니다. 크리에이터는 캠페인이 정해 준 영상을 편집하거나(클리핑) 제품·서비스를 소개하는 숏폼을 만들어 유튜브 쇼츠·틱톡·인스타그램 릴스 등에 올리고, 검수를 통과한 영상의 검증된 조회수만큼 정산받습니다. 새 채널이어도, 유튜브 수익창출 전이어도 참여할 수 있고 가입과 지원은 무료입니다.`,
    '',
    '## 이런 크리에이터에게 맞아요',
    '- 유튜브 수익창출(파트너 프로그램) 조건을 아직 채우지 못한 새 채널이나 작은 채널: 구독자 수 조건이 없습니다.',
    '- 편집은 할 수 있지만 직접 촬영하거나 얼굴을 드러내고 싶지 않은 사람: 클리핑 캠페인은 정해진 영상을 편집해 올립니다.',
    '- 숏폼으로 부업 수익을 만들고 싶은 사람, 하이라이트·클립 채널을 운영하는 사람.',
    '- 이미 쇼츠·릴스·틱톡 채널을 운영하며 추가 수익을 원하는 크리에이터.',
    '',
    '## 클리핑과 캠페인',
    '- 클리핑(clipping): 캠페인이 정해 준 영상(방송, 신제품 영상, 게임 플레이 등)을 내 방식대로 자르고, 자막을 넣고, 순서를 바꿔 숏폼으로 편집해 올리는 일입니다. 찍지 않아도 편집만으로 참여할 수 있습니다.',
    '- 캠페인: 브랜드나 아티스트, 크리에이터가 Clipers에 맡긴 숏폼 제작 의뢰입니다. 참여한 크리에이터는 올린 영상의 검증된 조회수만큼 Clipers에서 받고, 캠페인 지급 한도에 도달하면 캠페인이 끝납니다.',
    '- 클리핑 캠페인은 원작자가 사용을 허락한 영상만 다룹니다.',
    '',
    '## 캠페인 종류',
    '- 클리핑 캠페인: 정해진 영상을 편집해 숏폼으로 만듭니다. 얼굴을 드러내지 않아도 됩니다.',
    '- 소개 캠페인: 제품이나 서비스를 내 스타일대로 소개하는 숏폼을 찍습니다. 리뷰, 일상, 상황극 등 형식은 자유입니다.',
    '- 음악 캠페인(준비 중): 정해진 음원을 배경음으로 쓰거나 챌린지에 참여합니다.',
    '',
    '## 정산과 지급 (크리에이터)',
    `- 캠페인마다 조회수 1천 회당 받는 금액이 먼저 공개됩니다. 예: 1천 회당 ${formatKRW(rate)}인 캠페인에서 조회수 10만 회면 ${formatKRW(rate * 100)}.`,
    `- 영상 하나의 조회수가 ${count(MIN_PAYOUT_VIEWS)}회를 넘으면 그전 조회수까지 모두 정산되고, 이후 늘어난 조회수는 매주 정산됩니다.`,
    '- 영상 하나로 받을 수 있는 최대 금액은 캠페인마다 다르며, 캠페인 상세에 공개됩니다.',
    `- 정산된 금액이 ${formatKRW(MIN_WITHDRAWAL)} 이상이면 지급을 요청할 수 있습니다.`,
    `- 올린 영상은 ${reviewHours}시간 안에 운영팀이 검수합니다. 반려되면 사유를 알려 주며, 고친 영상을 다시 올리거나 이의제기를 보낼 수 있습니다.`,
    '- 조회수 확인: 유튜브는 조회수를 자동으로 가져오고, 다른 플랫폼은 화면 캡처를 제출하면 운영팀이 확인합니다.',
    '- 올릴 수 있는 플랫폼: 유튜브 쇼츠, 틱톡, 인스타그램 릴스, 페이스북, X, 네이버 클립, 카카오 숏폼 (캠페인마다 정해져 있음).',
    '',
    '## 참여 방법',
    `1. [캠페인 둘러보기](${siteUrl('/discover')})에서 관심 분야와 플랫폼에 맞는 캠페인을 고릅니다.`,
    '2. 캠페인에 지원하고, 운영팀 승인을 받습니다.',
    '3. 요구사항에 맞춰 숏폼을 만들어 올리고 링크를 제출합니다.',
    '4. 검수를 통과한 영상의 조회수만큼 매주 정산받고, 원할 때 지급을 요청합니다.',
    '',
    '## 가이드 (크리에이터)',
    ...GUIDE_GROUPS.filter((group) => group.audience === 'creator').flatMap((group) => [
      `### ${group.label}`,
      ...GUIDES.filter((guide) => guide.group === group.id).map(
        (guide) => `- [${guide.title}](${siteUrl(`/guides/${guide.slug}`)}): ${guide.answer.join(' ')}`
      ),
      '',
    ]),
    '## 자주 묻는 질문 (크리에이터)',
    ...CREATOR_FAQ.flatMap((item) => [`### ${item.q}`, item.a, '']),
    '## 브랜드·아티스트·광고주',
    `- 캠페인은 ${formatKRW(MIN_CAMPAIGN_BUDGET)}(부가세 별도)부터 열 수 있고, 검수를 통과한 영상의 검증된 조회수만큼만 예산이 쓰입니다. 캠페인을 만들 때 예산을 넣으면 예상 조회수를 바로 보여 줍니다.`,
    `- 상담이 필요하면 [상담 문의](${siteUrl('/contact')})에 남기면 운영팀이 이메일로 답합니다.`,
    `- 자세한 안내: [브랜드 안내](${siteUrl('/brands')})`,
    '',
    '## 가이드 (광고주)',
    ...GUIDE_GROUPS.filter((group) => group.audience === 'advertiser').flatMap((group) => [
      `### ${group.label}`,
      ...GUIDES.filter((guide) => guide.group === group.id).map(
        (guide) => `- [${guide.title}](${siteUrl(`/guides/${guide.slug}`)}): ${guide.answer.join(' ')}`
      ),
      '',
    ]),
    '## 자주 묻는 질문 (광고주)',
    ...ADVERTISER_FAQ.flatMap((item) => [`### ${item.q}`, item.a, '']),
    '## 페이지',
    `- [크리에이터 안내](${siteUrl('/')}): 클리핑 설명, 캠페인 종류, 정산과 지급 기준`,
    `- [캠페인 둘러보기](${siteUrl('/discover')}): 지금 참여할 수 있는 캠페인 목록`,
    `- [가이드](${siteUrl('/guides')}): 수익창출 전 수익, 클리핑 부업, 상황별·고민별 안내, 플랫폼별 정산`,
    `- [브랜드 안내](${siteUrl('/brands')}): 캠페인 개설과 예산 기준`,
    '',
    '## 진행 중인 캠페인',
    ...(campaigns.length > 0
      ? campaigns.map(
          (campaign) =>
            `- [${campaign.title}](${siteUrl(`/campaigns/${campaign.id}`)}): ${campaign.brandName} · ${campaign.category} · 1천 회당 ${formatKRW(campaign.creatorCpm)} · 남은 지급 한도 ${formatKRW(campaign.payoutRemaining)}`
        )
      : ['- 현재 진행 중인 캠페인이 없습니다.']),
    '',
    '## English summary',
    `Clipers is a Korean short-form campaign platform where creators earn per verified view, with no subscriber minimum and before YouTube monetization. Creators clip campaign-provided videos (or make product showcase shorts), post them to YouTube Shorts, TikTok, Instagram Reels and other platforms, and are paid per 1,000 verified views from the campaign budget (for example ${formatKRW(rate)} per 1,000 views). Sign-up and applying are free.`,
    '',
  ];
  return new Response(lines.join('\n'), { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
