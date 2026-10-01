'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Send } from 'lucide-react';
import { platformLabel } from '@clipers/db';
import { Button, Dialog, Field, Input, Select } from '@clipers/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

export default function SubmitClipDialog({ campaignId, campaignTitle, platforms, creatorId }: {
  campaignId: string;
  campaignTitle: string;
  platforms: string[];
  creatorId: string;
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

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    const { error: insertError } = await getSupabaseBrowserClient()
      .from('clips')
      .insert({ campaign_id: campaignId, creator_id: creatorId, platform, url: url.trim() });
    setSubmitting(false);
    if (insertError) {
      setError('제출하지 못했어요. 링크와 플랫폼을 확인한 뒤 다시 시도해 주세요.');
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
            <Button disabled={submitting || !platform || !url.trim()} form={formId} type="submit" variant="primary">
              {submitting ? '제출 중…' : '제출하기'}
            </Button>
          </>
        }
        onClose={close}
        open={open}
        title={`${campaignTitle} · 클립 제출`}
      >
        <form className="cl-auth__form" id={formId} onSubmit={submit}>
          <Field htmlFor={`${formId}-platform`} label="플랫폼">
            <Select id={`${formId}-platform`} onChange={(event) => setPlatform(event.target.value)} required value={platform}>
              <option value="">플랫폼 선택</option>
              {platforms.map((value) => (
                <option key={value} value={value}>{platformLabel(value)}</option>
              ))}
            </Select>
          </Field>
          <Field hint="공개 상태로 게시된 영상 링크를 붙여 넣어 주세요." htmlFor={`${formId}-url`} label="영상 링크">
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
