import { describe, it, expect } from 'vitest';
import {
  INTERESTS,
  MAX_INTERESTS,
  canContinueOnboarding,
  emptyOnboardingAnswers,
  onboardingSteps,
  toggleInterest,
  type OnboardingAnswers,
} from './onboarding';

const completeCreator: OnboardingAnswers = {
  role: 'creator',
  interests: ['music'],
  onCamera: 'always',
  experienceLevel: 'new',
  termsAgreed: true,
  privacyAgreed: true,
};

describe('onboardingSteps', () => {
  it('walks creators through every profile question', () => {
    expect(onboardingSteps('creator')).toEqual(['role', 'earn', 'interests', 'camera', 'experience', 'terms']);
  });

  it('sends brands straight to terms', () => {
    expect(onboardingSteps('brand')).toEqual(['role', 'terms']);
  });
});

describe('toggleInterest', () => {
  it('adds and removes an interest', () => {
    expect(toggleInterest([], 'music')).toEqual(['music']);
    expect(toggleInterest(['music', 'gaming'], 'music')).toEqual(['gaming']);
  });

  it('ignores additions past the maximum', () => {
    const full = INTERESTS.slice(0, MAX_INTERESTS).map((interest) => interest.id);
    expect(toggleInterest(full, INTERESTS[MAX_INTERESTS].id)).toEqual(full);
  });
});

describe('canContinueOnboarding', () => {
  it('requires an answer on each question step', () => {
    const empty = emptyOnboardingAnswers();
    expect(canContinueOnboarding('role', empty)).toBe(false);
    expect(canContinueOnboarding('earn', empty)).toBe(true);
    expect(canContinueOnboarding('interests', empty)).toBe(false);
    expect(canContinueOnboarding('camera', empty)).toBe(false);
    expect(canContinueOnboarding('experience', empty)).toBe(false);
    expect(canContinueOnboarding('terms', empty)).toBe(false);
  });

  it('allows continuing once each step is answered', () => {
    for (const step of onboardingSteps('creator')) {
      expect(canContinueOnboarding(step, completeCreator)).toBe(true);
    }
  });

  it('needs both consents on the terms step', () => {
    expect(canContinueOnboarding('terms', { ...completeCreator, privacyAgreed: false })).toBe(false);
  });
});
