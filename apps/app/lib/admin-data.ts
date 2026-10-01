import { cache } from 'react';
import { getSession } from './session';

export type AdminQueueCounts = {
  deposits: number;
  applications: number;
  clips: number;
  overdueClips: number;
  viewReports: number;
  disputes: number;
};

/** Open work per operator queue, deduplicated per request (sidebar badges and the overview share it). */
export const getAdminQueueCounts = cache(async (): Promise<AdminQueueCounts> => {
  const { supabase } = await getSession();
  const count = { count: 'exact' as const, head: true };
  const [deposits, applications, clips, overdueClips, viewReports, disputes] = await Promise.all([
    supabase.from('campaigns').select('id', count).eq('status', 'pending_escrow'),
    supabase.from('campaign_applications').select('id', count).eq('status', 'applied'),
    supabase.from('clips').select('id', count).eq('status', 'pending_review'),
    supabase.from('clips').select('id', count).eq('status', 'pending_review').lt('sla_deadline', new Date().toISOString()),
    supabase.from('manual_view_reports').select('id', count).eq('status', 'pending'),
    supabase.from('clip_disputes').select('id', count).eq('status', 'open'),
  ]);
  return {
    deposits: deposits.count ?? 0,
    applications: applications.count ?? 0,
    clips: clips.count ?? 0,
    overdueClips: overdueClips.count ?? 0,
    viewReports: viewReports.count ?? 0,
    disputes: disputes.count ?? 0,
  };
});
