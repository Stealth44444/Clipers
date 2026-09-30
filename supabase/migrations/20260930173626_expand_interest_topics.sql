-- Interest topics now cover every kind of YouTube content (official categories + Korean short-form genres).
-- Keep in sync with INTERESTS in packages/db/src/onboarding.ts (enforced by onboarding.test.ts).

alter table public.profiles drop constraint profiles_interests_valid;

alter table public.profiles
  add constraint profiles_interests_valid check (
    cardinality(interests) <= 3
    and interests <@ array[
      'music', 'kpop', 'dance', 'entertainment', 'comedy', 'film_drama',
      'animation_webtoon', 'gaming', 'asmr', 'vlog', 'beauty', 'fashion',
      'food', 'cooking', 'travel', 'pets', 'kids_family', 'home_interior',
      'outdoor', 'sports', 'fitness', 'health', 'education', 'language',
      'science', 'tech', 'finance', 'business', 'news', 'books',
      'self_improvement', 'social_impact', 'art_design', 'photo_video', 'diy', 'autos'
    ]::text[]
  );
