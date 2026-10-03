import { cache } from 'react';
import { fetchAllRows, signupsByHeardFrom, signupsByUtmSource, type SignupAttributionRow } from '@clipers/db';
import { getSession } from './session';

export type AdminQueueCounts = {
  deposits: number;
  applications: number;
  clips: number;
  overdueClips: number;
  viewReports: number;
  disputes: number;
  /** Payout requests waiting for a bank transfer. */
  payouts: number;
  refunds: number;
  /** Non-YouTube accounts waiting for an operator to check the code. */
  channels: number;
};

export const SIGNUP_SOURCE_DAYS = 30;

/** Where recent sign-ups came from (signup_attributions, admins only): per self-reported channel and per utm_source. */
export const getSignupSources = cache(async () => {
  const { supabase } = await getSession();
  const since = new Date(Date.now() - SIGNUP_SOURCE_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const rows = (await fetchAllRows((from, to) =>
    supabase.from('signup_attributions').select('requested_role, utm_source, heard_from').gte('created_at', since).order('created_at').range(from, to)
  )) as SignupAttributionRow[];
  return { total: rows.length, heardFrom: signupsByHeardFrom(rows), utmSource: signupsByUtmSource(rows) };
});

/** Open work per operator queue, deduplicated per request (sidebar badges and the overview share it). */
export const getAdminQueueCounts = cache(async (): Promise<AdminQueueCounts> => {
  const { supabase } = await getSession();
  const count = { count: 'exact' as const, head: true };
  const [deposits, applications, clips, overdueClips, viewReports, disputes, payouts, refunds, channels] = await Promise.all([
    supabase.from('campaigns').select('id', count).eq('status', 'pending_escrow'),
    supabase.from('campaign_applications').select('id', count).eq('status', 'applied'),
    supabase.from('clips').select('id', count).eq('status', 'pending_review'),
    supabase.from('clips').select('id', count).eq('status', 'pending_review').lt('sla_deadline', new Date().toISOString()),
    supabase.from('manual_view_reports').select('id', count).eq('status', 'pending'),
    supabase.from('clip_disputes').select('id', count).eq('status', 'open'),
    supabase.from('payouts').select('id', count).eq('status', 'requested'),
    supabase.from('brand_refunds').select('id', count).eq('status', 'requested'),
    supabase.from('creator_channels').select('id', count).is('verified_at', null).neq('platform', 'youtube_shorts'),
  ]);
  return {
    deposits: deposits.count ?? 0,
    applications: applications.count ?? 0,
    clips: clips.count ?? 0,
    overdueClips: overdueClips.count ?? 0,
    viewReports: viewReports.count ?? 0,
    disputes: disputes.count ?? 0,
    payouts: payouts.count ?? 0,
    refunds: refunds.count ?? 0,
    channels: channels.count ?? 0,
  };
});
