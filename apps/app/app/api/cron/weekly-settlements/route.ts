import { timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { runPendingSettlements, sendSlackNotification } from '@clipers/db';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Monday after the YouTube snapshot sync: settles last week, and any week a failed run left behind.

function isAuthorized(request: NextRequest, secret: string): boolean {
  const match = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;

  const supplied = Buffer.from(match[1]);
  const expected = Buffer.from(secret);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return NextResponse.json({ error: 'Cron endpoint is not configured.' }, { status: 503 });
  if (!isAuthorized(request, cronSecret)) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Required server configuration is missing.' }, { status: 503 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const result = await runPendingSettlements(supabase, 'cron');

  const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (slackWebhookUrl) {
    const text = result.ok
      ? result.data
          .filter((summary) => !summary.alreadyRun)
          .map((summary) => `주간 정산 ${summary.period} 주: 정산 ${summary.settlements}건, 예산 소진으로 마감한 캠페인 ${summary.closedCampaigns}건`)
          .join('\n')
      : `주간 정산이 실패했어요. 운영자 화면의 '밀린 정산 산출'로 다시 시도해 주세요.\n${result.message}`;
    if (text) await sendSlackNotification(slackWebhookUrl, text);
  }

  if (!result.ok) return NextResponse.json({ error: result.message }, { status: 502 });
  return NextResponse.json({ runs: result.data });
}
