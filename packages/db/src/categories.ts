import { INTERESTS, type InterestGroupId, type InterestId } from './onboarding';

// A campaign's 분야 is one of the creator interests (onboarding.ts), stored as its id ('kpop'), so a label can be
// renamed without losing campaigns. Campaigns saved before 2026-10-02 hold the Korean label ('K팝·아이돌'); every
// helper here reads both until the migration in supabase/pending/campaign_category_ids.sql moves them to ids.

const BY_ID = new Map<string, (typeof INTERESTS)[number]>(INTERESTS.map((interest) => [interest.id, interest]));
const BY_LABEL = new Map<string, (typeof INTERESTS)[number]>(INTERESTS.map((interest) => [interest.label, interest]));

function find(value: string) {
  return BY_ID.get(value) ?? BY_LABEL.get(value) ?? null;
}

export function isCategoryId(value: string): value is InterestId {
  return BY_ID.has(value);
}

/** The id for a stored category, whether it holds the id or a legacy label; null when it is neither. */
export function categoryId(value: string): InterestId | null {
  return (find(value)?.id as InterestId | undefined) ?? null;
}

/** What people read: '음악' for 'music' (or a legacy '음악'). Unknown values show as stored. */
export function categoryLabel(value: string): string {
  return find(value)?.label ?? value;
}

/** The interest group a category belongs to (the discover sidebar's 분야). */
export function categoryGroup(value: string): InterestGroupId | null {
  return (find(value)?.group as InterestGroupId | undefined) ?? null;
}
