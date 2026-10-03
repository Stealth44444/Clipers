import { timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { buildNotificationEmail, renderNotification } from '@clipers/db';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Sends the notification emails waiting in notification_email_queue() through Resend, every few minutes (pg_cron).
// Without RESEND_API_KEY and EMAIL_FROM it does nothing, so notifications stay in-app only.

type QueuedEmail = { id: string; email: string; kind: string; data: Record<string, unknown>; link: string | null; email_attempts: number };

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

  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!resendKey || !from || !appUrl) {
    return NextResponse.json({ sent: 0, skipped: 'Email is not configured.' });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Required server configuration is missing.' }, { status: 503 });
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const { data, error } = await supabase.rpc('notification_email_queue', { p_limit: 50 });
  if (error) {
    return NextResponse.json({ error: 'Could not load the email queue.' }, { status: 502 });
  }

  let sent = 0;
  let failed = 0;
  for (const item of (data ?? []) as QueuedEmail[]) {
    const email = buildNotificationEmail({ ...renderNotification(item.kind, item.data), link: item.link }, appUrl);
    let errorMessage: string | null = null;
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
          // Resend drops a repeated request with the same key, so a retried run can't send twice.
          'Idempotency-Key': `notification-${item.id}`,
        },
        body: JSON.stringify({ from, to: [item.email], subject: email.subject, html: email.html, text: email.text }),
      });
      if (!response.ok) errorMessage = `Resend HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`;
    } catch (cause) {
      errorMessage = cause instanceof Error ? cause.message : String(cause);
    }

    const update = errorMessage
      ? { email_attempts: item.email_attempts + 1, email_error: errorMessage }
      : { email_sent_at: new Date().toISOString(), email_attempts: item.email_attempts + 1, email_error: null };
    await supabase.from('notifications').update(update).eq('id', item.id);
    if (errorMessage) failed += 1;
    else sent += 1;
  }

  return NextResponse.json({ sent, failed });
}
