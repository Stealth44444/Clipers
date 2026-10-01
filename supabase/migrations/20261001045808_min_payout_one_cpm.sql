-- Minimum payout is 1 CPM: a clip is paid from 1,000 verified views, i.e. at least the creator rate.
-- Keep campaign_platform_rates.min_payout equal to the campaign's creator_cpm, like cpm_rate.
create or replace function public.sync_platform_rate_cpm()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select creator_cpm, creator_cpm into new.cpm_rate, new.min_payout from public.campaigns where id = new.campaign_id;
  return new;
end;
$$;

create or replace function public.propagate_creator_cpm()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.campaign_platform_rates set cpm_rate = new.creator_cpm, min_payout = new.creator_cpm where campaign_id = new.id;
  return new;
end;
$$;

update public.campaign_platform_rates r
set min_payout = c.creator_cpm
from public.campaigns c
where c.id = r.campaign_id and r.min_payout is distinct from c.creator_cpm and r.max_payout >= c.creator_cpm;
