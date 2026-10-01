import { Page, PageHeader } from '@clipers/ui';
import { getSession } from '@/lib/session';
import AnalyticsView, { type AnalyticsClip } from './analytics-view';

export default async function CreatorAnalyticsPage() {
  const { supabase, user } = await getSession();
  const { data: clips } = await supabase.from('clips').select('id, platform, status').eq('creator_id', user.id);
  const clipRows = clips ?? [];

  const { data: snapshots } = clipRows.length
    ? await supabase
        .from('view_snapshots')
        .select('clip_id, view_count, captured_at')
        .in('clip_id', clipRows.map((clip) => clip.id))
        .order('captured_at', { ascending: true })
    : { data: [] };

  const snapshotsByClip = new Map<string, { capturedAt: string; viewCount: number }[]>();
  for (const snapshot of snapshots ?? []) {
    snapshotsByClip.set(snapshot.clip_id, [
      ...(snapshotsByClip.get(snapshot.clip_id) ?? []),
      { capturedAt: snapshot.captured_at, viewCount: Number(snapshot.view_count) },
    ]);
  }

  const analyticsClips: AnalyticsClip[] = clipRows.map((clip) => ({
    id: clip.id,
    platform: clip.platform,
    status: clip.status,
    snapshots: snapshotsByClip.get(clip.id) ?? [],
  }));

  return (
    <Page>
      <PageHeader description="제출한 클립의 조회수 흐름을 확인하세요. 날짜는 한국 시간 기준이에요." title="분석" />
      <AnalyticsView clips={analyticsClips} />
    </Page>
  );
}
