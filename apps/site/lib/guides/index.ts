import { PLATFORM_GUIDES } from './platform';
import { PROBLEM_GUIDES } from './problem';
import { SITUATION_GUIDES } from './situation';
import { TOPIC_GUIDES } from './topic';
import type { Guide, GuideGroup } from './types';

export type { Guide, GuideGroup, GuideSection } from './types';

export const GUIDE_GROUPS: { id: GuideGroup; label: string }[] = [
  { id: 'topic', label: '시작하기' },
  { id: 'situation', label: '상황별' },
  { id: 'problem', label: '고민별' },
  { id: 'platform', label: '플랫폼' },
];

export const GUIDES: Guide[] = [...TOPIC_GUIDES, ...SITUATION_GUIDES, ...PROBLEM_GUIDES, ...PLATFORM_GUIDES];

export function guideBySlug(slug: string): Guide | undefined {
  return GUIDES.find((guide) => guide.slug === slug);
}
