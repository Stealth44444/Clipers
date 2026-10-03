// Option ids must match the profiles check constraints in supabase/migrations (a test enforces this for interests).

export const INTEREST_GROUPS = [
  { id: 'entertainment', label: '엔터테인먼트' },
  { id: 'lifestyle', label: '라이프스타일' },
  { id: 'health', label: '운동·건강' },
  { id: 'knowledge', label: '지식·정보' },
  { id: 'hobby', label: '취미·창작' },
] as const;

// Covers every kind of topic uploaded to YouTube (its official categories plus common Korean short-form genres).
export const INTERESTS = [
  { id: 'music', label: '음악', group: 'entertainment' },
  { id: 'kpop', label: 'K팝·아이돌', group: 'entertainment' },
  { id: 'dance', label: '댄스', group: 'entertainment' },
  { id: 'entertainment', label: '예능·방송', group: 'entertainment' },
  { id: 'comedy', label: '유머·밈', group: 'entertainment' },
  { id: 'film_drama', label: '영화·드라마', group: 'entertainment' },
  { id: 'animation_webtoon', label: '애니·웹툰', group: 'entertainment' },
  { id: 'gaming', label: '게임', group: 'entertainment' },
  { id: 'asmr', label: 'ASMR', group: 'entertainment' },
  { id: 'vlog', label: '브이로그·일상', group: 'lifestyle' },
  { id: 'beauty', label: '뷰티', group: 'lifestyle' },
  { id: 'fashion', label: '패션', group: 'lifestyle' },
  { id: 'food', label: '먹방·맛집', group: 'lifestyle' },
  { id: 'cooking', label: '요리·레시피', group: 'lifestyle' },
  { id: 'travel', label: '여행', group: 'lifestyle' },
  { id: 'pets', label: '반려동물', group: 'lifestyle' },
  { id: 'kids_family', label: '키즈·육아', group: 'lifestyle' },
  { id: 'home_interior', label: '인테리어·살림', group: 'lifestyle' },
  { id: 'outdoor', label: '캠핑·아웃도어', group: 'lifestyle' },
  { id: 'sports', label: '스포츠', group: 'health' },
  { id: 'fitness', label: '운동·헬스', group: 'health' },
  { id: 'health', label: '건강·의학', group: 'health' },
  { id: 'education', label: '교육·학습', group: 'knowledge' },
  { id: 'language', label: '외국어', group: 'knowledge' },
  { id: 'science', label: '과학', group: 'knowledge' },
  { id: 'tech', label: '테크·IT', group: 'knowledge' },
  { id: 'finance', label: '재테크·경제', group: 'knowledge' },
  { id: 'business', label: '비즈니스·창업', group: 'knowledge' },
  { id: 'news', label: '뉴스·시사', group: 'knowledge' },
  { id: 'books', label: '책·인문', group: 'knowledge' },
  { id: 'self_improvement', label: '자기계발', group: 'knowledge' },
  { id: 'social_impact', label: '사회·공익', group: 'knowledge' },
  { id: 'art_design', label: '미술·디자인', group: 'hobby' },
  { id: 'photo_video', label: '사진·영상 제작', group: 'hobby' },
  { id: 'diy', label: 'DIY·만들기', group: 'hobby' },
  { id: 'autos', label: '자동차·모빌리티', group: 'hobby' },
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

/** "How did you hear about Clipers?" — optional, asked right before the terms. Ids match signup_attributions_heard_from_valid. */
export const HEARD_FROM_OPTIONS = [
  { id: 'search', label: '검색 (네이버·구글)' },
  { id: 'youtube_shortform', label: '유튜브·숏폼에서 봤어요' },
  { id: 'instagram_tiktok', label: '인스타그램·틱톡' },
  { id: 'friend_creator', label: '지인·크리에이터 추천' },
  { id: 'community_blog', label: '커뮤니티·블로그' },
  { id: 'press', label: '기사·뉴스' },
  { id: 'other', label: '기타' },
] as const;

export type HeardFrom = (typeof HEARD_FROM_OPTIONS)[number]['id'];
export type OnboardingRole = 'creator' | 'brand';
export type OnboardingStep = 'role' | 'earn' | 'interests' | 'camera' | 'experience' | 'source' | 'terms';
export type InterestId = (typeof INTERESTS)[number]['id'];
export type InterestGroupId = (typeof INTEREST_GROUPS)[number]['id'];

export function interestsByGroup() {
  return INTEREST_GROUPS.map((group) => ({
    ...group,
    interests: INTERESTS.filter((interest) => interest.group === group.id),
  }));
}
export type OnCamera = (typeof ON_CAMERA_OPTIONS)[number]['id'];
export type ExperienceLevel = (typeof EXPERIENCE_OPTIONS)[number]['id'];

export type OnboardingAnswers = {
  role: OnboardingRole | null;
  interests: string[];
  onCamera: OnCamera | null;
  experienceLevel: ExperienceLevel | null;
  /** Optional; null when skipped. */
  heardFrom: HeardFrom | null;
  termsAgreed: boolean;
  privacyAgreed: boolean;
  /** "만 19세 이상이에요" — Clipers is for adults only (terms art. 5). */
  adultConfirmed: boolean;
};

export function emptyOnboardingAnswers(): OnboardingAnswers {
  return {
    role: null,
    interests: [],
    onCamera: null,
    experienceLevel: null,
    heardFrom: null,
    termsAgreed: false,
    privacyAgreed: false,
    adultConfirmed: false,
  };
}

/** Both roles answer where they heard of Clipers (optional) before the terms. */
export function onboardingSteps(role: OnboardingRole | null): OnboardingStep[] {
  return role === 'brand' ? ['role', 'source', 'terms'] : ['role', 'earn', 'interests', 'camera', 'experience', 'source', 'terms'];
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
    case 'source':
      return true;
    case 'terms':
      return answers.termsAgreed && answers.privacyAgreed && answers.adultConfirmed;
  }
}

/** Campaign categories are stored as interest labels; this finds the label's group for marketplace filters. */
export function interestGroupOfCategory(category: string): InterestGroupId | null {
  return INTERESTS.find((interest) => interest.label === category)?.group ?? null;
}
