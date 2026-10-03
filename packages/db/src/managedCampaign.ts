// Managed campaigns: an operator sets up a brand's campaign on contract terms, including its own rates.
import { DEFAULT_PRICING, type CampaignPricing } from './pricing';

/** Contract rates per 1,000 verified views: whole won, creators paid something, Clipers never paying more than it bills. */
export function validateManagedPricing(brandCpm: number, creatorCpm: number): { ok: true; pricing: CampaignPricing } | { ok: false; message: string } {
  if (!Number.isInteger(brandCpm) || !Number.isInteger(creatorCpm)) return { ok: false, message: '단가는 원 단위 정수로 입력해 주세요.' };
  if (creatorCpm <= 0) return { ok: false, message: '크리에이터 단가를 입력해 주세요.' };
  if (brandCpm < creatorCpm) return { ok: false, message: '브랜드 단가는 크리에이터 단가보다 낮을 수 없어요.' };
  return { ok: true, pricing: { brandCpm, creatorCpm } };
}

/** The rates a new managed campaign starts from. */
export const MANAGED_DEFAULT_PRICING: CampaignPricing = DEFAULT_PRICING;
