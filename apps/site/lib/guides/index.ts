import { advertiserFaqById } from '../advertiser-faq';
import { faqById } from '../creator-faq';
import { ADVERTISER_PROBLEM_GUIDES } from './advertiser-problem';
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
  { id: 'industry', audience: 'advertiser', label: '업종별' },
  { id: 'advertiser-problem', audience: 'advertiser', label: '고민별' },
];

export const GUIDES: Guide[] = [
  ...TOPIC_GUIDES,
  ...SITUATION_GUIDES,
  ...PROBLEM_GUIDES,
  ...PLATFORM_GUIDES,
  ...INDUSTRY_GUIDES,
  ...ADVERTISER_PROBLEM_GUIDES,
];

export function guideBySlug(slug: string): Guide | undefined {
  return GUIDES.find((guide) => guide.slug === slug);
}

/** A guide's FAQ entries, from its audience's FAQ. */
export function guideFaqs(guide: Guide): { id: string; q: string; a: string }[] {
  return guide.faqIds.map((id) => (guide.audience === 'advertiser' ? advertiserFaqById(id) : faqById(id)));
}
