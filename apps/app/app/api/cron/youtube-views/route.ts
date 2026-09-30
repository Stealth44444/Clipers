import { timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { extractYouTubeVideoId, fetchYouTubeViewCounts } from '@clipers/db';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PAGE_SIZE = 500;
const MAX_CLIPS_PER_RUN = 500;
const REFRESH_WINDOW_HOURS = 24;

function isAuthorized(request: NextRequest, secret: string): boolean {
  const match = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;

  const supplied = Buffer.from(match[1]);
  const expected = Buffer.from(secret);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

function responseError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return responseError('Cron endpoint is not configured.', 503);
  if (!isAuthorized(request, cronSecret)) return responseError('Unauthorized.', 401);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const youtubeApiKey = process.env.YOUTUBE_DATA_API_KEY;
  if (!supabaseUrl || !serviceRoleKey || !youtubeApiKey) {
    return responseError('Required server configuration is missing.', 503);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const refreshedAfter = new Date(Date.now() - REFRESH_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
  const candidates: Array<{ id: string; url: string; videoId: string }> = [];
  let offset = 0;
  let scanned = 0;
  let skippedRecent = 0;
  let skippedInvalidUrl = 0;

  while (candidates.length < MAX_CLIPS_PER_RUN) {
    const { data, error } = await supabase
      .from('clips')
      .select('id,url')
      .eq('status', 'approved')
      .order('id', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) return responseError('Could not load approved clips.', 502);
    const page = data ?? [];
    scanned += page.length;
    if (page.length === 0) break;

    const pageCandidates = page.flatMap((clip) => {
      const videoId = extractYouTubeVideoId(clip.url);
      if (!videoId) {
        skippedInvalidUrl += 1;
        return [];
      }
      return [{ id: clip.id, url: clip.url, videoId }];
    });

    if (pageCandidates.length > 0) {
      const { data: recentSnapshots, error: snapshotError } = await supabase
        .from('view_snapshots')
        .select('clip_id')
        .in('clip_id', pageCandidates.map((clip) => clip.id))
        .gte('captured_at', refreshedAfter);

      if (snapshotError) return responseError('Could not load recent view snapshots.', 502);
      const recentClipIds = new Set((recentSnapshots ?? []).map((snapshot) => snapshot.clip_id));
      const freshCandidates = pageCandidates.filter((clip) => {
        if (!recentClipIds.has(clip.id)) return true;
        skippedRecent += 1;
        return false;
      });
      candidates.push(...freshCandidates.slice(0, MAX_CLIPS_PER_RUN - candidates.length));
    }

    offset += page.length;
    if (page.length < PAGE_SIZE) break;
  }

  if (candidates.length === 0) {
    return NextResponse.json({ scanned, selected: 0, inserted: 0, skippedRecent, skippedInvalidUrl });
  }

  const viewCountResult = await fetchYouTubeViewCounts(
    candidates.map((clip) => clip.url),
    youtubeApiKey
  );
  if (!viewCountResult.ok) {
    return responseError(viewCountResult.message, 502);
  }

  const viewCounts = new Map(viewCountResult.data.map((item) => [item.videoId, item.viewCount]));
  const snapshots = candidates.flatMap((clip) => {
    const viewCount = viewCounts.get(clip.videoId);
    return viewCount === undefined ? [] : [{ clip_id: clip.id, view_count: viewCount }];
  });

  if (snapshots.length > 0) {
    const { error } = await supabase.from('view_snapshots').insert(snapshots);
    if (error) return responseError('Could not save view snapshots.', 502);
  }

  return NextResponse.json({
    scanned,
    selected: candidates.length,
    inserted: snapshots.length,
    unavailable: candidates.length - snapshots.length,
    skippedRecent,
    skippedInvalidUrl,
  });
}
