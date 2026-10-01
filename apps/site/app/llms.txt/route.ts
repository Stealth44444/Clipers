import { formatKRW } from '@clipers/ui';
import { loadLiveCampaigns } from '@/lib/campaigns';
import { siteUrl } from '@/lib/urls';

export const revalidate = 3600;

/** llms.txt: a plain-language summary for AI answer engines (https://llmstxt.org). */
export async function GET() {
  const campaigns = await loadLiveCampaigns();
  const lines = [
    '# Clipers',
    '',
    '> Clipers는 검증된 조회수만큼 정산되는 국내 숏폼 클리핑 캠페인 플랫폼입니다. 브랜드는 예산을 걸고 캠페인을 열고, 크리에이터는 유튜브 쇼츠·틱톡·인스타그램 릴스 등에 영상을 올린 뒤 링크를 제출합니다. 운영팀 검수를 통과한 영상의 조회수만 정산됩니다.',
    '',
    '## 크리에이터',
    '- 가입·지원 무료. 캠페인마다 지원서 심사 후 참여합니다.',
    '- 정산: 검증된 조회수 1천 회당 캠페인에 공지된 금액. 클립 하나의 조회수가 1,000회(최소 지급 기준)를 넘으면 그전 조회수까지 포함해 정산되고, 이후 매주 늘어난 조회수가 정산됩니다. 지급 요청 후 지급됩니다.',
    '- 유튜브는 조회수를 자동 수집하고, 그 밖의 플랫폼은 화면 캡처로 조회수를 신고합니다.',
    '',
    '## 브랜드',
    '- 최소 예산 1,000,000원. 검증된 조회수만큼만 예산이 쓰입니다.',
    '- 캠페인을 만들고 예산을 입금하면 운영팀 확인 후 공개됩니다.',
    '',
    '## 페이지',
    `- [크리에이터 안내](${siteUrl('/')}): 캠페인 지원, 정산과 지급 기준`,
    `- [브랜드 안내](${siteUrl('/brands')}): 캠페인 개설과 예산 기준`,
    `- [캠페인 둘러보기](${siteUrl('/discover')}): 지금 참여할 수 있는 캠페인 목록`,
    '',
    '## 진행 중인 캠페인',
    ...(campaigns.length > 0
      ? campaigns.map(
          (campaign) =>
            `- [${campaign.title}](${siteUrl(`/campaigns/${campaign.id}`)}): ${campaign.brandName} · ${campaign.category} · 1천 회당 ${formatKRW(campaign.creatorCpm)} · 남은 예산 ${formatKRW(campaign.remainingBudget)}`
        )
      : ['- 현재 진행 중인 캠페인이 없습니다.']),
    '',
  ];
  return new Response(lines.join('\n'), { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
