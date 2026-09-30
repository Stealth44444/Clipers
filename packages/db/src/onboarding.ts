// Option ids must match the check constraints in supabase/migrations/20260930172325_onboarding.sql.

export const INTERESTS = [
  { id: 'music', label: '음악·K팝' },
  { id: 'entertainment', label: '엔터테인먼트' },
  { id: 'gaming', label: '게임' },
  { id: 'beauty_fashion', label: '뷰티·패션' },
  { id: 'food', label: '푸드' },
  { id: 'tech', label: '테크' },
  { id: 'sports', label: '스포츠' },
  { id: 'lifestyle', label: '일상·여행' },
  { id: 'education', label: '교육·정보' },
  { id: 'comedy', label: '유머' },
] as const;

export const MAX_INTERESTS = 3;

export const ON_CAMERA_OPTIONS = [
  { id: 'always', label: '얼굴을 보여 줘요', description: '직접 출연하는 영상을 올려요' },
  { id: 'sometimes', label: '가끔 보여 줘요', description: '콘텐츠에 따라 달라요' },
  { id: 'never', label: '얼굴 없이 해요', description: '편집·자막·목소리로만 만들어요' },
  { id: 'undecided', label: '아직 정하지 않았어요', description: '해 보면서 정할게요' },
] as const;

export const EXPERIENCE_OPTIONS = [
  { id: 'new', label: '처음이에요', description: '숏폼을 올려 본 적이 없어요' },
  { id: 'beginner', label: '몇 번 해 봤어요', description: '가끔 올리는 편이에요' },
  { id: 'intermediate', label: '꾸준히 하고 있어요', description: '정기적으로 올려요' },
  { id: 'pro', label: '전업으로 해요', description: '콘텐츠가 주 수입원이에요' },
] as const;

export type OnboardingRole = 'creator' | 'brand';
export type OnboardingStep = 'role' | 'earn' | 'interests' | 'camera' | 'experience' | 'terms';
export type InterestId = (typeof INTERESTS)[number]['id'];
export type OnCamera = (typeof ON_CAMERA_OPTIONS)[number]['id'];
export type ExperienceLevel = (typeof EXPERIENCE_OPTIONS)[number]['id'];

export type OnboardingAnswers = {
  role: OnboardingRole | null;
  interests: string[];
  onCamera: OnCamera | null;
  experienceLevel: ExperienceLevel | null;
  termsAgreed: boolean;
  privacyAgreed: boolean;
};

export function emptyOnboardingAnswers(): OnboardingAnswers {
  return { role: null, interests: [], onCamera: null, experienceLevel: null, termsAgreed: false, privacyAgreed: false };
}

export function onboardingSteps(role: OnboardingRole | null): OnboardingStep[] {
  return role === 'brand' ? ['role', 'terms'] : ['role', 'earn', 'interests', 'camera', 'experience', 'terms'];
}

export function toggleInterest(selected: readonly string[], id: string): string[] {
  if (selected.includes(id)) return selected.filter((value) => value !== id);
  if (selected.length >= MAX_INTERESTS) return [...selected];
  return [...selected, id];
}

export function canContinueOnboarding(step: OnboardingStep, answers: OnboardingAnswers): boolean {
  switch (step) {
    case 'role':
      return answers.role !== null;
    case 'earn':
      return true;
    case 'interests':
      return answers.interests.length > 0;
    case 'camera':
      return answers.onCamera !== null;
    case 'experience':
      return answers.experienceLevel !== null;
    case 'terms':
      return answers.termsAgreed && answers.privacyAgreed;
  }
}
