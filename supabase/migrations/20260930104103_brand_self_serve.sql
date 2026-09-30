-- 1) 회원가입 시 역할 선택 허용 (브랜드/크리에이터만, admin은 화이트리스트에서 제외해 자가 승격 불가)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text := new.raw_user_meta_data->>'requested_role';
  resolved_role public.user_role := 'creator';
begin
  if requested_role = 'brand' then
    resolved_role := 'brand';
  end if;

  insert into public.profiles (id, role, display_name)
  values (new.id, resolved_role, coalesce(new.raw_user_meta_data->>'name', new.email));
  return new;
end;
$$;

-- 2) campaigns RLS 강화: 기존 campaigns_brand_crud(모든 필드를 아무 때나 수정 가능)를
--    insert/update/select로 쪼개서 브랜드가 draft 상태에서만 자유 수정, draft->pending_escrow
--    전환만 가능하도록 제한. admin은 별도 정책으로 전체 접근 유지.
drop policy campaigns_brand_crud on campaigns;

create policy campaigns_select_own_or_admin on campaigns
  for select using (brand_id = auth.uid() or current_role_is('admin'));

create policy campaigns_brand_insert_own on campaigns
  for insert with check (
    brand_id = auth.uid()
    and track = 'self_serve'
    and status = 'draft'
    and current_role_is('brand')
  );

create policy campaigns_brand_update_own on campaigns
  for update using (brand_id = auth.uid() and status = 'draft')
  with check (brand_id = auth.uid() and status in ('draft', 'pending_escrow'));

create policy campaigns_admin_all on campaigns
  for all using (current_role_is('admin'))
  with check (current_role_is('admin'));

-- 3) 캠페인 생성 시 에스크로 행 자동 생성 (브랜드는 campaign_escrow에 직접 쓰지 않음)
create or replace function public.create_campaign_escrow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.campaign_escrow (campaign_id, escrow_status)
  values (new.id, 'awaiting_manual_confirm');
  return new;
end;
$$;

create trigger create_campaign_escrow
  after insert on campaigns
  for each row execute function public.create_campaign_escrow();

-- 4) 운영자가 입금 확인(escrow_status -> confirmed) 시 캠페인 자동 라이브 전환
create or replace function public.activate_campaign_on_escrow_confirmed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.escrow_status = 'confirmed' and old.escrow_status = 'awaiting_manual_confirm' then
    update public.campaigns
    set status = 'live'
    where id = new.campaign_id and status = 'pending_escrow';
  end if;
  return new;
end;
$$;

create trigger activate_campaign_on_escrow_confirmed
  after update on campaign_escrow
  for each row execute function public.activate_campaign_on_escrow_confirmed();

-- 5) 브랜드가 자기 캠페인의 정산 내역(예산 소진율 계산용)을 볼 수 있도록 허용
create policy settlements_brand_select on settlements
  for select using (
    exists (select 1 from campaigns c where c.id = campaign_id and c.brand_id = auth.uid())
  );

-- 6) 신규 트리거 전용 함수도 PostgREST RPC로 직접 호출되지 않도록 EXECUTE 권한 회수
revoke execute on function public.create_campaign_escrow() from public, anon, authenticated;
revoke execute on function public.activate_campaign_on_escrow_confirmed() from public, anon, authenticated;
