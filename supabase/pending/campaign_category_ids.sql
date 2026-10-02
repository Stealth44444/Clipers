-- NOT a migration yet: Supabase was disconnected on 2026-10-02. Move into supabase/migrations and apply when it is back.
-- The app already writes ids and reads both ids and labels (packages/db/src/categories.ts), so this can go in any time.
--
-- Campaign 분야 becomes the creator interest id ('kpop') instead of its Korean label ('K팝·아이돌'), so a label can be
-- renamed without losing campaigns, and the database refuses anything outside the list in packages/db/src/onboarding.ts
-- (categories.test.ts checks every pair below against it).

update public.campaigns c
set category = map.id
from (values
  ('음악', 'music'),
  ('K팝·아이돌', 'kpop'),
  ('댄스', 'dance'),
  ('예능·방송', 'entertainment'),
  ('유머·밈', 'comedy'),
  ('영화·드라마', 'film_drama'),
  ('애니·웹툰', 'animation_webtoon'),
  ('게임', 'gaming'),
  ('ASMR', 'asmr'),
  ('브이로그·일상', 'vlog'),
  ('뷰티', 'beauty'),
  ('패션', 'fashion'),
  ('먹방·맛집', 'food'),
  ('요리·레시피', 'cooking'),
  ('여행', 'travel'),
  ('반려동물', 'pets'),
  ('키즈·육아', 'kids_family'),
  ('인테리어·살림', 'home_interior'),
  ('캠핑·아웃도어', 'outdoor'),
  ('스포츠', 'sports'),
  ('운동·헬스', 'fitness'),
  ('건강·의학', 'health'),
  ('교육·학습', 'education'),
  ('외국어', 'language'),
  ('과학', 'science'),
  ('테크·IT', 'tech'),
  ('재테크·경제', 'finance'),
  ('비즈니스·창업', 'business'),
  ('뉴스·시사', 'news'),
  ('책·인문', 'books'),
  ('자기계발', 'self_improvement'),
  ('사회·공익', 'social_impact'),
  ('미술·디자인', 'art_design'),
  ('사진·영상 제작', 'photo_video'),
  ('DIY·만들기', 'diy'),
  ('자동차·모빌리티', 'autos')
) as map(label, id)
where c.category = map.label;

do $$
begin
  if exists (select 1 from public.campaigns where category not in ('music', 'kpop', 'dance', 'entertainment', 'comedy', 'film_drama', 'animation_webtoon', 'gaming', 'asmr', 'vlog', 'beauty', 'fashion', 'food', 'cooking', 'travel', 'pets', 'kids_family', 'home_interior', 'outdoor', 'sports', 'fitness', 'health', 'education', 'language', 'science', 'tech', 'finance', 'business', 'news', 'books', 'self_improvement', 'social_impact', 'art_design', 'photo_video', 'diy', 'autos')) then
    raise exception 'Some campaigns have a category outside the interest list; fix them before adding the constraint';
  end if;
end;
$$;

alter table public.campaigns
  add constraint campaigns_category_valid check (category in ('music', 'kpop', 'dance', 'entertainment', 'comedy', 'film_drama', 'animation_webtoon', 'gaming', 'asmr', 'vlog', 'beauty', 'fashion', 'food', 'cooking', 'travel', 'pets', 'kids_family', 'home_interior', 'outdoor', 'sports', 'fitness', 'health', 'education', 'language', 'science', 'tech', 'finance', 'business', 'news', 'books', 'self_improvement', 'social_impact', 'art_design', 'photo_video', 'diy', 'autos'));
