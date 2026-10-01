import { Page, PageHeader } from '@clipers/ui';
import { getSession } from '@/lib/session';
import SubmissionsView, { type SubmissionRow } from './submissions-view';

export default async function CreatorSubmissionsPage() {
  const { supabase, user } = await getSession();
  const [clips, disputes, reports] = await Promise.all([
    supabase
      .from('clips')
      .select('id, url, platform, status, submitted_at, sla_deadline, rejection_reason, campaign:campaigns!clips_campaign_id_fkey(title)')
      .eq('creator_id', user.id)
      .order('submitted_at', { ascending: false }),
    supabase.from('clip_disputes').select('clip_id, status, resolution_note').eq('creator_id', user.id),
    supabase.from('manual_view_reports').select('clip_id, status, reported_view_count').eq('creator_id', user.id),
  ]);

  const disputeByClip = new Map((disputes.data ?? []).map((dispute) => [dispute.clip_id, dispute]));
  const reportsByClip = new Map<string, { status: string; reported_view_count: number }[]>();
  for (const report of reports.data ?? []) {
    reportsByClip.set(report.clip_id, [...(reportsByClip.get(report.clip_id) ?? []), report]);
  }

  const rows: SubmissionRow[] = ((clips.data ?? []) as unknown as Omit<SubmissionRow, 'dispute' | 'viewReport'>[]).map((clip) => {
    const clipReports = reportsByClip.get(clip.id) ?? [];
    return {
      ...clip,
      dispute: disputeByClip.get(clip.id) ?? null,
      viewReport:
        clipReports.find((report) => report.status === 'verified') ?? clipReports.find((report) => report.status === 'pending') ?? null,
    };
  });

  return (
    <Page>
      <PageHeader description="제출한 클립의 검수 결과를 확인하고, 필요하면 이의제기나 조회수 신고를 할 수 있어요." title="제출 현황" />
      <SubmissionsView creatorId={user.id} rows={rows} />
    </Page>
  );
}
