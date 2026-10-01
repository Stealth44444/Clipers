import { DEFAULT_PRICING, MIN_CAMPAIGN_BUDGET, creatorPayoutCap } from './pricing';

export const CAMPAIGN_TITLE_MAX = 80;
export const CAMPAIGN_DESCRIPTION_MAX = 2000;
export const CAMPAIGN_REQUIREMENTS_MAX = 2000;
export const MAX_REFERENCE_LINKS = 10;
export const REVIEW_SLA_OPTIONS = [24, 48, 72] as const;

export type CampaignDraft = {
  title: string;
  description: string;
  contentType: 'clipping' | 'ugc';
  category: string;
  platforms: string[];
  totalBudget: string;
  maxPayoutPerClip: string;
  reviewSlaHours: string;
  referenceLinks: string[];
  requirements: string;
};

/** Field order matches the form, so the first error points at the topmost problem. */
export const CAMPAIGN_DRAFT_FIELDS = [
  'title',
  'description',
  'category',
  'platforms',
  'totalBudget',
  'maxPayoutPerClip',
  'referenceLinks',
  'requirements',
] as const;

export type CampaignDraftField = (typeof CAMPAIGN_DRAFT_FIELDS)[number];

export function emptyCampaignDraft(): CampaignDraft {
  return {
    title: '',
    description: '',
    contentType: 'clipping',
    category: '',
    platforms: [],
    totalBudget: '',
    maxPayoutPerClip: '',
    reviewSlaHours: '48',
    referenceLinks: [''],
    requirements: '',
  };
}

const won = (value: number) => `${value.toLocaleString('ko-KR')}원`;

export function filledReferenceLinks(links: string[]): string[] {
  return links.map((link) => link.trim()).filter(Boolean);
}

export function campaignDraftErrors(draft: CampaignDraft): Partial<Record<CampaignDraftField, string>> {
  const errors: Partial<Record<CampaignDraftField, string>> = {};
  const title = draft.title.trim();
  if (!title) errors.title = '캠페인 이름을 입력해 주세요.';
  else if (title.length > CAMPAIGN_TITLE_MAX) errors.title = `캠페인 이름은 ${CAMPAIGN_TITLE_MAX}자 이하로 입력해 주세요.`;

  if (draft.description.trim().length > CAMPAIGN_DESCRIPTION_MAX) {
    errors.description = `설명은 ${CAMPAIGN_DESCRIPTION_MAX.toLocaleString('ko-KR')}자 이하로 입력해 주세요.`;
  }
  if (!draft.category.trim()) errors.category = '카테고리를 골라 주세요.';
  if (draft.platforms.length === 0) errors.platforms = '플랫폼을 하나 이상 골라 주세요.';

  const budget = Number(draft.totalBudget);
  if (!draft.totalBudget.trim() || !Number.isFinite(budget)) errors.totalBudget = '예산을 입력해 주세요.';
  else if (budget < MIN_CAMPAIGN_BUDGET) errors.totalBudget = `예산은 최소 ${won(MIN_CAMPAIGN_BUDGET)}부터예요.`;

  const cap = Number(draft.maxPayoutPerClip);
  if (!draft.maxPayoutPerClip.trim() || !Number.isFinite(cap) || cap <= 0) {
    errors.maxPayoutPerClip = '클립당 최대 지급액을 입력해 주세요.';
  } else if (!errors.totalBudget) {
    const creatorBudget = creatorPayoutCap(budget, DEFAULT_PRICING);
    if (cap > creatorBudget) errors.maxPayoutPerClip = `클립당 최대 지급액은 ${won(creatorBudget)}을 넘을 수 없어요.`;
  }

  const links = filledReferenceLinks(draft.referenceLinks);
  if (links.length > MAX_REFERENCE_LINKS) errors.referenceLinks = `참고 링크는 ${MAX_REFERENCE_LINKS}개까지 넣을 수 있어요.`;
  else if (links.some((link) => !/^https?:\/\/\S+\.\S+/.test(link))) errors.referenceLinks = '참고 링크는 https://로 시작하는 주소여야 해요.';

  if (draft.requirements.trim().length > CAMPAIGN_REQUIREMENTS_MAX) {
    errors.requirements = `요구사항은 ${CAMPAIGN_REQUIREMENTS_MAX.toLocaleString('ko-KR')}자 이하로 입력해 주세요.`;
  }
  return errors;
}

export function firstCampaignDraftError(draft: CampaignDraft): string | null {
  const errors = campaignDraftErrors(draft);
  const field = CAMPAIGN_DRAFT_FIELDS.find((key) => errors[key]);
  return field ? errors[field]! : null;
}
