import { timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { buildEscalationSlackMessage, buildEscalationSummary, sendSlackNotification } from '@clipers/db';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function isAuthorized(request: NextRequest, secret: string): boolean {
  const match = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;

  const supplied = Buffer.from(match[1]);
  const expected = Buffer.from(secret);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'Cron endpoint is not configured.' }, { status: 503 });
  }
  if (!isAuthorized(request, cronSecret)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Required server configuration is missing.' }, { status: 503 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: pendingItems, error } = await supabase
    .from('clips')
    .select(
      'id,status,sla_deadline,escalation_sent_at,url,campaign:campaigns!clips_campaign_id_fkey(title),creator:profiles!clips_creator_id_fkey(display_name)'
    )
    .eq('status', 'pending_review');

  if (error) {
    return NextResponse.json({ error: 'Could not load pending review clips.' }, { status: 502 });
  }

  const summary = buildEscalationSummary(
    (pendingItems ?? []).map((item) => ({
      id: item.id,
      status: item.status,
      deadline: item.sla_deadline,
      escalationSentAt: item.escalation_sent_at,
    })),
    new Date()
  );

  if (summary.total === 0) {
    return NextResponse.json({ escalated: 0, ids: [] });
  }

  const escalatedIds = new Set(summary.ids);
  const escalatedClips = (pendingItems ?? []).filter((item) => escalatedIds.has(item.id)) as unknown as Array<{
    url: string;
    sla_deadline: string;
    campaign: { title: string } | null;
    creator: { display_name: string } | null;
  }>;

  // Alert first, then mark: a failed Slack post leaves the clips unmarked so the next run tries again.
  let slackNotified = false;
  const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (slackWebhookUrl) {
    const message = buildEscalationSlackMessage(
      escalatedClips.map((clip) => ({
        campaignTitle: clip.campaign?.title ?? '캠페인',
        creatorName: clip.creator?.display_name ?? '크리에이터',
        url: clip.url,
        slaDeadline: clip.sla_deadline,
      }))
    );
    const slackResult = await sendSlackNotification(slackWebhookUrl, message);
    if (!slackResult.ok) {
      return NextResponse.json({ error: slackResult.message, pending: summary.total }, { status: 502 });
    }
    slackNotified = true;
  }

  const { error: updateError } = await supabase
    .from('clips')
    .update({ escalation_sent_at: new Date().toISOString(), escalation_channel: slackNotified ? 'slack' : 'internal' })
    .in('id', summary.ids);

  if (updateError) {
    return NextResponse.json({ error: 'Could not mark escalations as sent.' }, { status: 502 });
  }

  return NextResponse.json({ escalated: summary.total, ids: summary.ids, slackNotified });
}
