-- Daily clip limit per campaign (the owner picks 1, 2, 3, 5 or none; default 3) and a per-creator payout cap
-- (docs/superpowers/specs/2026-10-02-clip-limits-design.md).

alter table public.campaigns
  add column daily_clip_limit integer default 3 check (daily_clip_limit is null or daily_clip_limit in (1, 2, 3, 5));

grant select (daily_clip_limit) on public.campaigns to anon, authenticated;

-- Submission check: the existing rules, plus the daily limit. A day starts at midnight Korea time; pending and approved
-- clips count, rejected ones don't. The advisory lock keeps two quick submissions from both slipping under the limit.
create or replace function public.prepare_clip_submission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  campaign_sla_hours integer;
  campaign_daily_limit integer;
  submitted_today integer;
begin
  if new.creator_id is distinct from auth.uid() then
    raise exception 'A clip can only be submitted for the current user';
  end if;

  select c.review_sla_hours, c.daily_clip_limit into campaign_sla_hours, campaign_daily_limit
  from campaigns c
  join campaign_applications ca on ca.campaign_id = c.id
  where c.id = new.campaign_id
    and c.status = 'live'
    and new.platform = any(c.allowed_platforms)
    and ca.creator_id = new.creator_id
    and ca.status = 'approved';

  if campaign_sla_hours is null then
    raise exception 'An approved application to a live campaign is required';
  end if;

  if campaign_daily_limit is not null then
    perform pg_advisory_xact_lock(hashtextextended(new.creator_id::text || ':' || new.campaign_id::text, 0));
    select count(*) into submitted_today
    from clips
    where campaign_id = new.campaign_id
      and creator_id = new.creator_id
      and status in ('pending_review', 'approved')
      and submitted_at >= (date_trunc('day', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul');
    if submitted_today >= campaign_daily_limit then
      raise exception 'daily_clip_limit_reached' using detail = campaign_daily_limit::text;
    end if;
  end if;

  new.status := 'pending_review';
  new.rejection_reason := null;
  new.submitted_at := now();
  new.sla_deadline := new.submitted_at + make_interval(hours => campaign_sla_hours);
  new.reviewed_at := null;
  new.reviewed_by := null;

  return new;
end;
$$;

-- Where the signed-in creator stands against each campaign's cap: only 'ok', 'near' (80%) or 'reached', never the
-- amount. The share mirrors CREATOR_CAMPAIGN_SHARE in packages/db/src/pricing.ts.
create or replace function public.creator_campaign_cap_states(p_campaign_ids uuid[])
returns table (campaign_id uuid, state text)
language sql
stable
security definer
set search_path = public
as $$
  select c.id,
    case
      when coalesce(s.paid, 0) >= floor(c.total_budget * 0.15) then 'reached'
      when coalesce(s.paid, 0) >= floor(c.total_budget * 0.15) * 0.8 then 'near'
      else 'ok'
    end
  from public.campaigns c
  left join (
    select st.campaign_id, sum(st.amount) as paid
    from public.settlements st
    where st.creator_id = auth.uid() and st.campaign_id = any(p_campaign_ids)
    group by st.campaign_id
  ) s on s.campaign_id = c.id
  where c.id = any(p_campaign_ids) and auth.uid() is not null;
$$;

revoke execute on function public.creator_campaign_cap_states(uuid[]) from public;
grant execute on function public.creator_campaign_cap_states(uuid[]) to authenticated;
