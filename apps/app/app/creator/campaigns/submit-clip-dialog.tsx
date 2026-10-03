'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Send } from 'lucide-react';
import { platformLabel } from '@clipers/db';
import { Button, Dialog, Field, Input, Select } from '@clipers/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import { submitYouTubeClip, type SubmitClipFailure } from './submit-clip-action';

export default function SubmitClipDialog({ campaignId, campaignTitle, platforms, creatorId, dailyLimit, leftToday }: {
  campaignId: string;
  campaignTitle: string;
  platforms: string[];
  creatorId: string;
  /** Clips one creator may submit here per day (null: no limit); the database enforces it too. */
  dailyLimit: number | null;
  /** Submissions left today (null: no limit). */
  leftToday: number | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState(platforms.length === 1 ? platforms[0] : '');
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [, startTransition] = useTransition();

  function close() {
    setOpen(false);
    setError('');
  }

  function failureMessage(reason: SubmitClipFailure, message: string): string {
    if (reason === 'duplicate') return '이미 제출된 영상이에요. 같은 영상은 한 번만 제출할 수 있어요.';
    if (reason === 'daily_limit') return `오늘은 이 캠페인에 영상을 ${dailyLimit ?? ''}개까지 올릴 수 있어요. 내일 다시 올려 주세요.`;
    if (reason === 'account_not_verified') return "설정의 '내 채널'에서 이 플랫폼 계정을 인증한 뒤 제출할 수 있어요. 운영팀 확인을 기다리는 계정은 아직 쓸 수 없어요.";
    return message || '제출하지 못했어요. 링크와 플랫폼을 확인한 뒤 다시 시도해 주세요.';
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    let result: { ok: true } | { ok: false; reason: SubmitClipFailure; message: string };
    if (platform === 'youtube_shorts') {
      result = await submitYouTubeClip(campaignId, url);
    } else {
      const { error: insertError } = await getSupabaseBrowserClient()
        .from('clips')
        .insert({ campaign_id: campaignId, creator_id: creatorId, platform, url: url.trim() });
      // 23505: clips_video_key_active_unique — this video is already submitted (here or in another campaign).
      result = !insertError
        ? { ok: true }
        : {
            ok: false,
            reason:
              insertError.code === '23505'
                ? 'duplicate'
                : insertError.message.includes('daily_clip_limit_reached')
                  ? 'daily_limit'
                  : insertError.message.includes('account_not_verified')
                    ? 'account_not_verified'
                    : 'other',
            message: '',
          };
    }
    setSubmitting(false);
    if (!result.ok) {
      setError(failureMessage(result.reason, result.message));
      return;
    }
    setUrl('');
    close();
    startTransition(() => router.push('/creator/submissions'));
  }

  const formId = `submit-clip-${campaignId}`;

  return (
    <>
      <Button icon={<Send size={15} />} onClick={() => setOpen(true)} size="sm" variant="primary">
        클립 제출
      </Button>
      <Dialog
        footer={
          <>
            <Button onClick={close} variant="secondary">취소</Button>
            <Button disabled={submitting || !platform || !url.trim() || leftToday === 0} form={formId} type="submit" variant="primary">
              {submitting ? '제출 중…' : '제출하기'}
            </Button>
          </>
        }
        onClose={close}
        open={open}
        title={`${campaignTitle} · 클립 제출`}
      >
        <form className="cl-auth__form" id={formId} onSubmit={submit}>
          {leftToday !== null && (
            <p className={leftToday === 0 ? 'cl-alert cl-tone-amber' : 'cl-meta'}>
              {leftToday === 0
                ? `오늘은 이 캠페인에 영상을 ${dailyLimit}개까지 올릴 수 있어요. 내일 다시 올려 주세요.`
                : `오늘 남은 제출 ${leftToday}개 · 하루 최대 ${dailyLimit}개`}
            </p>
          )}
          <Field htmlFor={`${formId}-platform`} label="플랫폼">
            <Select id={`${formId}-platform`} onChange={(event) => setPlatform(event.target.value)} required value={platform}>
              <option value="">플랫폼 선택</option>
              {platforms.map((value) => (
                <option key={value} value={value}>{platformLabel(value)}</option>
              ))}
            </Select>
          </Field>
          <Field
            hint={
              platform === 'youtube_shorts'
                ? "설정의 '내 채널'에서 인증한 채널에 캠페인 공개 이후 올린 공개 영상만 제출할 수 있어요."
                : "설정의 '내 채널'에서 인증한 계정에 캠페인 공개 이후 공개로 올린 영상 링크를 붙여 넣어 주세요."
            }
            htmlFor={`${formId}-url`}
            label="영상 링크"
          >
            <Input
              id={`${formId}-url`}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://youtube.com/shorts/..."
              required
              type="url"
              value={url}
            />
          </Field>
          {error && <p className="cl-alert cl-tone-tomato" role="alert">{error}</p>}
        </form>
      </Dialog>
    </>
  );
}
