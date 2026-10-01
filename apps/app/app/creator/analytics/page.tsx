import { fetchAllRows, platformLabel } from '@clipers/db';
import { Page, PageHeader } from '@clipers/ui';
import ViewsAnalytics from '@/components/views-analytics';
import { getSession } from '@/lib/session';
import { loadSnapshotsByClip } from '@/lib/snapshots';

export default async function CreatorAnalyticsPage() {
  const { supabase, user } = await getSession();
  const clips = await fetchAllRows((from, to) =>
    supabase.from('clips').select('id, platform, status').eq('creator_id', user.id).order('id').range(from, to)
  );
  const snapshots = await loadSnapshotsByClip(supabase, clips.map((clip) => clip.id));

  return (
    <Page>
      <PageHeader description="제출한 클립의 조회수 흐름을 확인하세요. 날짜는 한국 시간 기준이에요." title="분석" />
      <ViewsAnalytics
        clipLabel="제출한 클립"
        clips={clips.map((clip) => ({ id: clip.id, group: clip.platform, status: clip.status, snapshots: snapshots.get(clip.id) ?? [] }))}
        filter={{
          label: '플랫폼',
          allLabel: '모든 플랫폼',
          options: [...new Set(clips.map((clip) => clip.platform))].map((value) => ({ value, label: platformLabel(value) })),
        }}
      />
    </Page>
  );
}
