import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import {
  INTERESTS,
  MAX_INTERESTS,
  canContinueOnboarding,
  emptyOnboardingAnswers,
  interestGroupOfCategory,
  interestsByGroup,
  onboardingSteps,
  toggleInterest,
  type OnboardingAnswers,
} from './onboarding';

const MIGRATIONS_DIR = fileURLToPath(new URL('../../../supabase/migrations/', import.meta.url));

function interestIdsAllowedByDatabase(): string[] {
  const latest = readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort()
    .map((file) => readFileSync(MIGRATIONS_DIR + file, 'utf8'))
    .filter((sql) => sql.includes('profiles_interests_valid check'))
    .at(-1)!;
  const constraint = latest.slice(latest.lastIndexOf('profiles_interests_valid check'));
  const arrayLiteral = constraint.slice(constraint.indexOf('array['), constraint.indexOf(']::text[]'));
  return [...arrayLiteral.matchAll(/'([a-z_]+)'/g)].map((match) => match[1]);
}

describe('INTERESTS', () => {
  it('matches the ids allowed by the profiles_interests_valid constraint', () => {
    expect(interestIdsAllowedByDatabase().sort()).toEqual(INTERESTS.map((interest) => interest.id).sort());
  });

  it('has unique ids and puts every interest in a group', () => {
    const ids = INTERESTS.map((interest) => interest.id);
    expect(new Set(ids).size).toBe(ids.length);
    const grouped = interestsByGroup();
    expect(grouped.every((group) => group.interests.length > 0)).toBe(true);
    expect(grouped.flatMap((group) => group.interests).length).toBe(INTERESTS.length);
  });
});

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

describe('interestGroupOfCategory', () => {
  it('maps a campaign category label to its interest group', () => {
    expect(interestGroupOfCategory('K팝·아이돌')).toBe('entertainment');
    expect(interestGroupOfCategory('운동·헬스')).toBe('health');
  });

  it('returns null for free-text categories from before the picker existed', () => {
    expect(interestGroupOfCategory('기타')).toBeNull();
  });
});
