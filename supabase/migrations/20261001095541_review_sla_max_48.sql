-- Review happens within 48 hours at most (the creator page promises it). Mirrors REVIEW_SLA_OPTIONS in
-- packages/db/src/campaignDraft.ts. Campaigns created with 72 hours move down to 48.
update public.campaigns set review_sla_hours = 48 where review_sla_hours > 48;

alter table public.campaigns
  add constraint campaigns_review_sla_hours_max check (review_sla_hours <= 48);
