import { describe, it, expect } from 'vitest';
import { MIN_CAMPAIGN_BUDGET } from './pricing';
import { campaignDraftErrors, emptyCampaignDraft, firstCampaignDraftError, type CampaignDraft } from './campaignDraft';

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

  it('rejects a per-clip cap above what creators can be paid in total', () => {
    expect(campaignDraftErrors({ ...valid, totalBudget: '1000000', maxPayoutPerClip: '300000' }).maxPayoutPerClip).toBe(
      '클립당 최대 지급액은 266,666원을 넘을 수 없어요.'
    );
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
