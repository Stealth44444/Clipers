'use server';

import { sendSlackNotification } from '@clipers/db';
import { inquirySlackText, validateInquiry, type InquiryField } from '@/lib/inquiry';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export type ContactState = {
  status: 'idle' | 'error' | 'done';
  errors: Partial<Record<InquiryField, string>>;
  message?: string;
  /** What was typed, sent back on errors: React resets the form after an action, so the fields refill from this. */
  values?: Record<string, string>;
  /** Bumped on every reply so the form remounts and every field (the select too) takes the values back. */
  attempt?: number;
};

export async function submitInquiry(previous: ContactState, formData: FormData): Promise<ContactState> {
  const attempt = (previous.attempt ?? 0) + 1;
  const input: Record<string, unknown> = {};
  formData.forEach((value, key) => {
    input[key] = value;
  });
  const result = validateInquiry(input);
  const values = Object.fromEntries(
    ['company', 'contactName', 'email', 'phone', 'industry', 'message'].map((key) => [key, typeof input[key] === 'string' ? (input[key] as string) : ''])
  );
  // A filled honeypot gets the same thank-you a person would, and nothing is stored.
  if (!result.ok && result.spam) return { status: 'done', errors: {} };
  if (!result.ok) return { status: 'error', errors: result.errors, message: '입력한 내용을 확인해 주세요.', values, attempt };

  const inquiry = result.value;
  const sourcePath = String(formData.get('sourcePath') ?? '').slice(0, 200) || null;
  // Insert only: the inquiries table lets the public add rows but never read them back, so no .select() here.
  const { error } = await getSupabaseServerClient().from('inquiries').insert({
    company: inquiry.company,
    contact_name: inquiry.contactName,
    email: inquiry.email,
    phone: inquiry.phone,
    industry: inquiry.industry,
    message: inquiry.message,
    source_path: sourcePath,
    consented_at: new Date().toISOString(),
  });
  if (error) return { status: 'error', errors: {}, message: '문의를 보내지 못했어요. 잠시 뒤 다시 시도해 주세요.', values, attempt };

  const webhook = process.env.SLACK_WEBHOOK_URL;
  if (webhook) await sendSlackNotification(webhook, inquirySlackText(inquiry));

  return { status: 'done', errors: {} };
}
