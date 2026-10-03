-- Managed campaigns: an operator creates the campaign for a brand on contract terms (its own rates and budget). It
-- then runs exactly like a self-serve campaign (public, open to every creator), so track stays 'self_serve' and this
-- column marks who made it. Design: docs/superpowers/specs/2026-10-03-managed-campaigns-design.md.

alter table public.campaigns add column managed_by uuid references public.profiles(id) on delete set null;
create index campaigns_managed_by_idx on public.campaigns (managed_by) where managed_by is not null;

grant select (managed_by) on public.campaigns to authenticated;
