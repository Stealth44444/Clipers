import { advertiserFaqById } from '../advertiser-faq';
import { faqById } from '../creator-faq';
import { ADVERTISER_PLATFORM_GUIDES } from './advertiser-platform';
import { ADVERTISER_PROBLEM_GUIDES } from './advertiser-problem';
import { COMPARE_GUIDES } from './compare';
import { COST_GUIDES } from './cost';
import { EXECUTION_GUIDES } from './execution';
import { GLOSSARY_GUIDES } from './glossary';
import { INDUSTRY_GUIDES } from './industry';
import { PLATFORM_GUIDES } from './platform';
import { PROBLEM_GUIDES } from './problem';
import { SITUATION_GUIDES } from './situation';
import { TOPIC_GUIDES } from './topic';
import type { Guide, GuideAudience, GuideGroup } from './types';

export type { Guide, GuideAudience, GuideGroup, GuideSection } from './types';

export const GUIDE_AUDIENCES: { id: GuideAudience; label: string }[] = [
  { id: 'creator', label: '크리에이터' },
  { id: 'advertiser', label: '광고주' },
];

export const GUIDE_GROUPS: { id: GuideGroup; audience: GuideAudience; label: string }[] = [
  { id: 'topic', audience: 'creator', label: '시작하기' },
  { id: 'situation', audience: 'creator', label: '상황별' },
  { id: 'problem', audience: 'creator', label: '고민별' },
  { id: 'platform', audience: 'creator', label: '플랫폼' },
  // Advertiser groups in question-map order: awareness → platform → compare → cost → execution → terms → data.
  { id: 'pillar', audience: 'advertiser', label: '숏폼 마케팅 기본' },
  { id: 'advertiser-platform', audience: 'advertiser', label: '플랫폼별 마케팅' },
  { id: 'compare', audience: 'advertiser', label: '비교' },
  { id: 'cost', audience: 'advertiser', label: '비용과 예산' },
  { id: 'industry', audience: 'advertiser', label: '업종별' },
  { id: 'advertiser-problem', audience: 'advertiser', label: '고민별' },
  { id: 'execution', audience: 'advertiser', label: '실행과 신뢰' },
  { id: 'glossary', audience: 'advertiser', label: '용어' },
  { id: 'data', audience: 'advertiser', label: '데이터' },
];

export const GUIDES: Guide[] = [
  ...TOPIC_GUIDES,
  ...SITUATION_GUIDES,
  ...PROBLEM_GUIDES,
  ...PLATFORM_GUIDES,
  ...INDUSTRY_GUIDES,
  ...ADVERTISER_PROBLEM_GUIDES,
  ...ADVERTISER_PLATFORM_GUIDES,
  ...COMPARE_GUIDES,
  ...COST_GUIDES,
  ...EXECUTION_GUIDES,
  ...GLOSSARY_GUIDES,
];

export function guideBySlug(slug: string): Guide | undefined {
  return GUIDES.find((guide) => guide.slug === slug);
}

/** A guide's FAQ entries, from its audience's FAQ. */
export function guideFaqs(guide: Guide): { id: string; q: string; a: string }[] {
  return guide.faqIds.map((id) => (guide.audience === 'advertiser' ? advertiserFaqById(id) : faqById(id)));
}
