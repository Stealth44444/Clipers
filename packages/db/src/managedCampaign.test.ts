import { describe, expect, it } from 'vitest';
import { validateManagedPricing } from './managedCampaign';

describe('validateManagedPricing', () => {
  it('accepts contract rates where the brand rate covers the creator rate', () => {
    expect(validateManagedPricing(2500, 900)).toEqual({ ok: true, pricing: { brandCpm: 2500, creatorCpm: 900 } });
    expect(validateManagedPricing(900, 900).ok).toBe(true);
  });

  it('refuses fractions, a zero creator rate and a brand rate below the creator rate', () => {
    expect(validateManagedPricing(2500.5, 900).ok).toBe(false);
    expect(validateManagedPricing(2500, 0)).toEqual({ ok: false, message: '크리에이터 단가를 입력해 주세요.' });
    expect(validateManagedPricing(800, 900)).toEqual({ ok: false, message: '브랜드 단가는 크리에이터 단가보다 낮을 수 없어요.' });
  });
});
