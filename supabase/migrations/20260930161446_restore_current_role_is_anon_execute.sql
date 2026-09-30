-- 마켓플레이스 공개 정책들이 campaigns_select_own_or_admin(current_role_is 포함)과 OR로 결합되면서
-- anon 역할도 이 함수를 평가해야 하는 상황이 됐다. anon에서 회수했던 EXECUTE를 다시 부여한다.
-- (함수 자체는 auth.uid()가 null이면 항상 false를 반환하므로 anon에 열어도 안전)
grant execute on function public.current_role_is(user_role) to anon;
