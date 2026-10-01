import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import GuideArticle from '@/components/guide-article';
import LandingChrome from '@/components/landing-chrome';
import { loadLiveCampaigns } from '@/lib/campaigns';
import { GUIDES, guideBySlug } from '@/lib/guides';

export const revalidate = 300;
export const dynamicParams = false;

export function generateStaticParams() {
  return GUIDES.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const guide = guideBySlug((await params).slug);
  if (!guide) return {};
  return {
    title: `${guide.title} — Clipers`,
    description: guide.description,
    alternates: { canonical: `/guides/${guide.slug}` },
    openGraph: { title: guide.title, description: guide.description, type: 'article' },
  };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const guide = guideBySlug((await params).slug);
  if (!guide) notFound();
  const campaigns = (await loadLiveCampaigns()).sort((left, right) => right.remainingBudget - left.remainingBudget).slice(0, 3);
  return (
    <LandingChrome cta="무료로 시작하기" path="/guides">
      <GuideArticle campaigns={campaigns} guide={guide} />
    </LandingChrome>
  );
}
