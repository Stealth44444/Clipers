-- Postgres는 함수 생성 시 기본적으로 PUBLIC에 EXECUTE를 부여한다.
-- anon/authenticated에서만 회수해서는 PUBLIC 경로로 여전히 실행 가능했으므로 PUBLIC에서 직접 회수한다.

revoke execute on function public.handle_new_user() from public;
revoke execute on function public.prepare_clip_submission() from public;
revoke execute on function public.prevent_profile_role_escalation() from public;
revoke execute on function public.guard_creator_settlement_update() from public;
revoke execute on function public.stamp_dispute_resolution() from public;

revoke execute on function public.current_role_is(user_role) from public;
grant execute on function public.current_role_is(user_role) to authenticated;
