alter table settlements
  add column verified_views bigint not null default 0 check (verified_views >= 0),
  add column withholding_amount numeric(12,2) not null default 0 check (withholding_amount >= 0);

create unique index settlements_clip_period_unique
  on settlements (clip_id, period);

create policy settlements_creator_request_own on settlements
  for update using (
    creator_id = auth.uid()
    and status = 'pending'
  )
  with check (
    creator_id = auth.uid()
    and status = 'requested'
  );

create or replace function public.guard_creator_settlement_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.current_role_is('admin') then
    if old.creator_id is distinct from auth.uid()
      or old.status <> 'pending'
      or new.status <> 'requested'
      or row(
        new.creator_id,
        new.campaign_id,
        new.clip_id,
        new.amount,
        new.verified_views,
        new.withholding_amount,
        new.period
      ) is distinct from row(
        old.creator_id,
        old.campaign_id,
        old.clip_id,
        old.amount,
        old.verified_views,
        old.withholding_amount,
        old.period
      ) then
      raise exception 'Creators can only request their own pending settlement';
    end if;
  end if;

  return new;
end;
$$;

create trigger guard_creator_settlement_update
  before update on settlements
  for each row execute function public.guard_creator_settlement_update();
