-- Supabase 보안 어드바이저 대응 (2026-09-30):
-- 1) 트리거 전용 함수가 PostgREST RPC(/rest/v1/rpc/<fn>)로 직접 호출 가능한 문제 차단.
--    트리거 실행 자체는 테이블 DML 권한에 따라 동작하므로 이 REVOKE로 트리거 동작에는 영향 없음.
-- 2) search_path 미고정 함수 고정.

revoke execute on function public.handle_new_user() from anon, authenticated;
revoke execute on function public.prepare_clip_submission() from anon, authenticated;
revoke execute on function public.prevent_profile_role_escalation() from anon, authenticated;
revoke execute on function public.guard_creator_settlement_update() from anon, authenticated;
revoke execute on function public.stamp_dispute_resolution() from anon, authenticated;

-- current_role_is는 다수의 RLS 정책 안에서 authenticated 역할로 호출되므로 authenticated 권한은 유지.
-- anon은 이 함수를 필요로 하는 정책이 없어 회수.
revoke execute on function public.current_role_is(user_role) from anon;

alter function public.handle_new_user() set search_path = public;
alter function public.current_role_is(user_role) set search_path = public;
