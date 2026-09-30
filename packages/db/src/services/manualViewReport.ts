import type { SupabaseClient } from '@supabase/supabase-js';
import { err, ok, type ServiceResult } from './errors';

export type ManualViewReportDecision = 'verified' | 'rejected';

type ManualViewReportRow = {
  id: string;
  clip_id: string;
  reported_view_count: number;
};

export async function fileManualViewReport(
  supabase: SupabaseClient,
  clipId: string,
  creatorId: string,
  reportedViewCount: number,
  evidenceUrl: string
): Promise<ServiceResult<{ id: string }>> {
  if (!Number.isSafeInteger(reportedViewCount) || reportedViewCount < 0) {
    return err('invalid_view_count', '조회수는 0 이상의 정수여야 합니다.');
  }
  if (!evidenceUrl || evidenceUrl.trim().length === 0) {
    return err('evidence_required', '스크린샷 등 증빙 URL을 반드시 입력해야 합니다.');
  }

  const { data, error } = await supabase
    .from('manual_view_reports')
    .insert({
      clip_id: clipId,
      creator_id: creatorId,
      reported_view_count: reportedViewCount,
      evidence_url: evidenceUrl.trim(),
    })
    .select('id')
    .single();

  if (error) {
    return err('db_error', error.message);
  }

  return ok({ id: (data as { id: string }).id });
}

export async function reviewManualViewReport(
  supabase: SupabaseClient,
  reportId: string,
  reviewerId: string,
  decision: ManualViewReportDecision
): Promise<ServiceResult<{ id: string }>> {
  const { data, error } = await supabase
    .from('manual_view_reports')
    .update({
      status: decision,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', reportId)
    .eq('status', 'pending')
    .select('id,clip_id,reported_view_count')
    .single();

  if (error) {
    return err('db_error', error.message);
  }

  const report = data as ManualViewReportRow;

  if (decision === 'verified') {
    const { error: snapshotError } = await supabase.from('view_snapshots').insert({
      clip_id: report.clip_id,
      view_count: report.reported_view_count,
      source: 'manual',
    });
    if (snapshotError) {
      return err('db_error', snapshotError.message);
    }
  }

  return ok({ id: report.id });
}
