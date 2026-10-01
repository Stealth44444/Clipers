import type { Metadata } from 'next';
import { Search, Sparkles } from 'lucide-react';
import { INTEREST_GROUPS, extractYouTubeVideoId, interestGroupOfCategory } from '@clipers/db';
import { Card, CardGrid, EmptyState, Page, SectionHeader, Stack, Starfield, formatCompactNumber } from '@clipers/ui';
import CampaignCard from '@/components/campaign-card';
import JsonLd from '@/components/json-ld';
import SiteShell, { discoverHref } from '@/components/site-shell';
import { loadLiveCampaigns, loadTopClips } from '@/lib/campaigns';
import { siteUrl } from '@/lib/urls';

export const metadata: Metadata = {
  title: '캠페인 둘러보기 · Clipers',
  description: '지금 참여할 수 있는 숏폼 캠페인을 찾아보세요. 영상을 올리고 검증된 조회수만큼 정산받아요.',
  alternates: { canonical: '/discover' },
};

type SearchParams = Promise<{ q?: string; group?: string }>;

export default async function DiscoverPage({ searchParams }: { searchParams: SearchParams }) {
  const { q = '', group } = await searchParams;
  const activeGroup = INTEREST_GROUPS.find((item) => item.id === group) ?? null;
  const all = await loadLiveCampaigns();

  const query = q.trim().toLowerCase();
  const campaigns = all.filter((campaign) => {
    if (activeGroup && interestGroupOfCategory(campaign.category) !== activeGroup.id) return false;
    if (!query) return true;
    return [campaign.title, campaign.category, campaign.brandName].some((field) => field.toLowerCase().includes(query));
  });
  const featured = !query && !activeGroup ? [...all].sort((left, right) => right.remainingBudget - left.remainingBudget).slice(0, 5) : [];
  const topClips = !query ? await loadTopClips(campaigns.map((campaign) => campaign.id)) : [];

  return (
    <SiteShell activeGroup={activeGroup?.id}>
      <div className="cl-sky">
        <Starfield className="cl-sky__canvas" count={700} speed={0.45} trail={0.6} twinkle={0.25} />
      </div>
      <Page>
        <section className="cl-market-hero">
          <h1 className="cl-market-hero__title">{activeGroup ? `${activeGroup.label} 캠페인` : '지금 참여할 수 있는 캠페인'}</h1>
          <p className="cl-market-hero__description">영상을 올리고, 검증된 조회수만큼 정산받으세요. 지원은 무료예요.</p>
          <form action="/discover" className="cl-search" role="search">
            <Search aria-hidden size={18} />
            {activeGroup && <input name="group" type="hidden" value={activeGroup.id} />}
            <input aria-label="캠페인 검색" className="cl-input" defaultValue={q} name="q" placeholder="캠페인, 브랜드, 분야로 검색" type="search" />
          </form>
        </section>

        <Stack>
          {featured.length > 0 && (
            <section>
              <SectionHeader description="남은 예산이 많은 캠페인부터 보여요." title="추천 캠페인" />
              <div className="cl-rail">
                {featured.map((campaign) => (
                  <CampaignCard campaign={campaign} key={campaign.id} />
                ))}
              </div>
            </section>
          )}

          <section>
            <SectionHeader title={query ? `'${q.trim()}' 검색 결과 ${campaigns.length}개` : `캠페인 ${campaigns.length}개`} />
            {campaigns.length > 0 ? (
              <CardGrid>
                {campaigns.map((campaign) => (
                  <CampaignCard campaign={campaign} key={campaign.id} />
                ))}
              </CardGrid>
            ) : (
              <Card>
                <EmptyState
                  action={
                    query || activeGroup ? (
                      <a className="cl-link" href={discoverHref()}>
                        모든 캠페인 보기
                      </a>
                    ) : undefined
                  }
                  description={query || activeGroup ? '다른 검색어나 분야로 찾아보세요.' : '새 캠페인이 열리면 여기에 보여요.'}
                  icon={<Sparkles size={24} />}
                  title="조건에 맞는 캠페인이 없어요"
                  tone="neutral"
                />
              </Card>
            )}
          </section>

          {topClips.length > 0 && (
            <section>
              <SectionHeader description="캠페인에 올라온 영상 중 조회수가 높은 순서예요." title="인기 클립" />
              <div className="cl-clip-rail">
                {topClips.map((clip) => {
                  const videoId = extractYouTubeVideoId(clip.url);
                  return (
                    <a className="cl-clip" href={clip.url} key={clip.id} rel="noreferrer" target="_blank">
                      <div className="cl-clip__thumb">
                        {videoId && <img alt="" loading="lazy" src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`} />}
                        <span className="cl-clip__views">{formatCompactNumber(clip.viewCount)}회</span>
                      </div>
                      <span className="cl-clip__title">{clip.campaignTitle}</span>
                    </a>
                  );
                })}
              </div>
            </section>
          )}
        </Stack>
      </Page>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: metadata.title,
          description: metadata.description,
          url: siteUrl('/discover'),
          inLanguage: 'ko-KR',
          mainEntity: {
            '@type': 'ItemList',
            numberOfItems: campaigns.length,
            itemListElement: campaigns.map((campaign, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              url: siteUrl(`/campaigns/${campaign.id}`),
              name: campaign.title,
            })),
          },
        }}
      />
    </SiteShell>
  );
}
