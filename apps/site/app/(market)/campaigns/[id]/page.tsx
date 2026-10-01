import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { interestGroupOfCategory, platformLabels } from '@clipers/db';
import { Page, formatKRW } from '@clipers/ui';
import CampaignDetail from '@/components/campaign-detail';
import JsonLd from '@/components/json-ld';
import SiteShell from '@/components/site-shell';
import { loadCampaignDetail } from '@/lib/campaigns';
import { siteUrl } from '@/lib/urls';

export const revalidate = 60;

type Params = { params: Promise<{ id: string }> };

function summary(campaign: NonNullable<Awaited<ReturnType<typeof loadCampaignDetail>>>): string {
  return `${campaign.brandName}의 ${campaign.category} 숏폼 캠페인. ${platformLabels(campaign.platforms)}에 영상을 올리면 검증된 조회수 1천 회당 ${formatKRW(campaign.creatorCpm)}을 받아요. 남은 지급 한도 ${formatKRW(campaign.payoutRemaining)}.`;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const campaign = await loadCampaignDetail(id);
  if (!campaign) return { title: '캠페인을 찾을 수 없어요 · Clipers' };
  const description = summary(campaign);
  return {
    title: `${campaign.title} · ${campaign.brandName} 캠페인 · Clipers`,
    description,
    alternates: { canonical: `/campaigns/${id}` },
    openGraph: {
      type: 'website',
      title: campaign.title,
      description,
      url: `/campaigns/${id}`,
      images: campaign.coverImageUrl ? [{ url: campaign.coverImageUrl }] : undefined,
    },
  };
}

export default async function CampaignPage({ params }: Params) {
  const { id } = await params;
  const campaign = await loadCampaignDetail(id);
  if (!campaign) notFound();

  return (
    <SiteShell activeGroup={interestGroupOfCategory(campaign.category)}>
      <Page>
        <CampaignDetail campaign={campaign} />
      </Page>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: campaign.title,
          description: summary(campaign),
          url: siteUrl(`/campaigns/${id}`),
          inLanguage: 'ko-KR',
          image: campaign.coverImageUrl ?? undefined,
          about: { '@type': 'Brand', name: campaign.brandName },
          mainEntity: {
            '@type': 'Offer',
            name: `${campaign.title} 크리에이터 리워드`,
            category: campaign.category,
            price: campaign.creatorCpm,
            priceCurrency: 'KRW',
            priceSpecification: {
              '@type': 'UnitPriceSpecification',
              price: campaign.creatorCpm,
              priceCurrency: 'KRW',
              referenceQuantity: { '@type': 'QuantitativeValue', value: 1000, unitText: '검증 조회수' },
            },
            availability: 'https://schema.org/InStock',
            seller: { '@type': 'Organization', name: 'Clipers' },
          },
          breadcrumb: {
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: '캠페인', item: siteUrl('/discover') },
              { '@type': 'ListItem', position: 2, name: campaign.title, item: siteUrl(`/campaigns/${id}`) },
            ],
          },
        }}
      />
    </SiteShell>
  );
}
