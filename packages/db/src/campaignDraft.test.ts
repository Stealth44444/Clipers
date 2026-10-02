import { describe, it, expect } from 'vitest';
import { DEFAULT_PRICING, MIN_CAMPAIGN_BUDGET } from './pricing';
import {
  REVIEW_SLA_OPTIONS,
  campaignDraftErrors,
  campaignDraftProgress,
  dailyClipLimitValue,
  clipCapToCreatorPayout,
  creatorPayoutToClipCap,
  emptyCampaignDraft,
  firstCampaignDraftError,
  type CampaignDraft,
} from './campaignDraft';

const valid: CampaignDraft = {
  ...emptyCampaignDraft(),
  title: '신곡 챌린지',
  description: '후렴 구간을 사용한 숏폼을 만들어 주세요.',
  contentType: 'clipping',
  category: '음악',
  platforms: ['youtube_shorts', 'tiktok'],
  totalBudget: '2000000',
  maxPayoutPerClip: '100000',
  reviewSlaHours: '48',
  dailyClipLimit: '3',
  referenceLinks: ['https://youtu.be/abc'],
  requirements: '음원은 15초 이상 사용',
};

describe('campaignDraftErrors', () => {
  it('accepts a complete draft', () => {
    expect(campaignDraftErrors(valid)).toEqual({});
    expect(firstCampaignDraftError(valid)).toBeNull();
  });

  it('reports each missing field with a Korean message', () => {
    const errors = campaignDraftErrors(emptyCampaignDraft());
    expect(Object.keys(errors).sort()).toEqual(['category', 'maxPayoutPerClip', 'platforms', 'title', 'totalBudget'].sort());
    expect(errors.title).toBe('캠페인 이름을 입력해 주세요.');
  });

  it('enforces the minimum budget', () => {
    expect(campaignDraftErrors({ ...valid, totalBudget: String(MIN_CAMPAIGN_BUDGET - 1) }).totalBudget).toBe(
      '예산은 최소 1,000,000원부터예요.'
    );
  });

  it('rejects a per-clip cap above the total budget', () => {
    expect(campaignDraftErrors({ ...valid, totalBudget: '1000000', maxPayoutPerClip: '1000001' }).maxPayoutPerClip).toBe(
      '클립당 최대 예산은 총예산(1,000,000원)을 넘을 수 없어요.'
    );
  });

  it('needs the per-clip cap to cover at least the 1,000-view minimum payout', () => {
    expect(campaignDraftErrors({ ...valid, maxPayoutPerClip: '2999' }).maxPayoutPerClip).toBe(
      '클립당 최대 예산은 최소 3,000원(조회수 1천 회분)부터예요.'
    );
  });

  it('converts the per-clip cap between brand spend and creator payout', () => {
    expect(clipCapToCreatorPayout(300_000, DEFAULT_PRICING)).toBe(80_000);
    expect(creatorPayoutToClipCap(80_000, DEFAULT_PRICING)).toBe(300_000);
  });

  it('validates reference links and ignores blank rows', () => {
    expect(campaignDraftErrors({ ...valid, referenceLinks: ['', 'not a url'] }).referenceLinks).toBe('참고 링크는 https://로 시작하는 주소여야 해요.');
    expect(campaignDraftErrors({ ...valid, referenceLinks: ['', '  '] })).toEqual({});
  });

  it('limits text lengths', () => {
    expect(campaignDraftErrors({ ...valid, title: 'a'.repeat(81) }).title).toBe('캠페인 이름은 80자 이하로 입력해 주세요.');
    expect(campaignDraftErrors({ ...valid, description: 'a'.repeat(2001) }).description).toBe('설명은 2,000자 이하로 입력해 주세요.');
  });

  it('returns the first error in form order', () => {
    expect(firstCampaignDraftError({ ...valid, title: '', platforms: [] })).toBe('캠페인 이름을 입력해 주세요.');
  });
});

describe('dailyClipLimitValue', () => {
  it('defaults to three clips a day and accepts no limit', () => {
    expect(emptyCampaignDraft().dailyClipLimit).toBe('3');
    expect(dailyClipLimitValue({ ...valid, dailyClipLimit: 'none' })).toBeNull();
    expect(dailyClipLimitValue({ ...valid, dailyClipLimit: '5' })).toBe(5);
  });
});

describe('campaignDraftProgress', () => {
  it('counts completed form sections', () => {
    expect(campaignDraftProgress(emptyCampaignDraft())).toEqual({ done: 0, total: 6 });
    expect(campaignDraftProgress(valid)).toEqual({ done: 6, total: 6 });
    expect(campaignDraftProgress({ ...emptyCampaignDraft(), title: '이름', platforms: ['tiktok'] })).toEqual({ done: 1, total: 6 });
  });
});

describe('REVIEW_SLA_OPTIONS', () => {
  it('caps review at 48 hours, which the creator page promises', () => {
    expect(REVIEW_SLA_OPTIONS).toEqual([24, 48]);
    expect(REVIEW_SLA_OPTIONS).toContain(Number(emptyCampaignDraft().reviewSlaHours));
  });
});
