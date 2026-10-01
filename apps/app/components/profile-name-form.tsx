'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Field, Input } from '@clipers/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

export default function ProfileNameForm({ profileId, initialName, email, nameLabel }: {
  profileId: string;
  initialName: string;
  email: string;
  nameLabel: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [, startTransition] = useTransition();
  const dirty = name.trim() !== initialName;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('saving');
    const { error } = await getSupabaseBrowserClient().from('profiles').update({ display_name: name.trim() }).eq('id', profileId);
    setStatus(error ? 'error' : 'saved');
    if (!error) startTransition(() => router.refresh());
  }

  return (
    <Card title="프로필">
      <form className="cl-auth__form" onSubmit={save}>
        <Field htmlFor="profile-name" label={nameLabel}>
          <Input id="profile-name" maxLength={40} onChange={(event) => setName(event.target.value)} value={name} />
        </Field>
        <Field hint="로그인 이메일은 바꿀 수 없어요." htmlFor="profile-email" label="이메일">
          <Input disabled id="profile-email" readOnly value={email} />
        </Field>
        {status === 'error' && (
          <p className="cl-alert cl-tone-tomato" role="alert">
            저장하지 못했어요. 잠시 후 다시 시도해 주세요.
          </p>
        )}
        <div className="cl-inline">
          <Button disabled={!dirty || !name.trim() || status === 'saving'} type="submit" variant="primary">
            {status === 'saving' ? '저장 중…' : '저장'}
          </Button>
          {status === 'saved' && !dirty && <span className="cl-meta">저장했어요</span>}
        </div>
      </form>
    </Card>
  );
}
