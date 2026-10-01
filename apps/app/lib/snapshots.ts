import { fetchAllRowsIn } from '@clipers/db';
import type { getSupabaseServerClient } from './supabase-server';

type ServerClient = Awaited<ReturnType<typeof getSupabaseServerClient>>;
export type SnapshotPoint = { capturedAt: string; viewCount: number };

/** View snapshots for the given clips, grouped per clip in capture order. RLS limits rows to what the user may see. */
export async function loadSnapshotsByClip(supabase: ServerClient, clipIds: string[]): Promise<Map<string, SnapshotPoint[]>> {
  const byClip = new Map<string, SnapshotPoint[]>();
  const rows = await fetchAllRowsIn(clipIds, (ids) => (from, to) =>
    supabase
      .from('view_snapshots')
      .select('clip_id, view_count, captured_at')
      .in('clip_id', ids)
      .order('captured_at', { ascending: true })
      .order('id')
      .range(from, to)
  );
  for (const row of rows) {
    const points = byClip.get(row.clip_id) ?? [];
    points.push({ capturedAt: row.captured_at, viewCount: Number(row.view_count) });
    byClip.set(row.clip_id, points);
  }
  return byClip;
}
