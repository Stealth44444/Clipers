alter table clips
  add column escalation_sent_at timestamptz,
  add column escalation_channel text default 'internal';

create index if not exists idx_clips_pending_review_escalation
  on clips(status, escalation_sent_at, sla_deadline);
