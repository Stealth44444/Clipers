-- Supabase grants execute on new functions to anon directly, so revoking from public was not enough.
revoke execute on function public.creator_campaign_cap_states(uuid[]) from anon;
