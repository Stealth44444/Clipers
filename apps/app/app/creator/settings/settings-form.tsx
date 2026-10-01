'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { EXPERIENCE_OPTIONS, ON_CAMERA_OPTIONS, type ExperienceLevel, type OnCamera } from '@clipers/db';
import { Button, Card, Field, Input, OptionCard, StickyFooter } from '@clipers/ui';
import InterestPicker from '@/components/interest-picker';
import { EXPERIENCE_ICONS, ON_CAMERA_ICONS } from '@/components/profile-option-icons';
import type { SessionProfile } from '@/lib/session';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

export default function SettingsForm({ profile, email }: { profile: SessionProfile; email: string }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(profile.display_name);
  const [interests, setInterests] = useState(profile.interests);
  const [onCamera, setOnCamera] = useState(profile.on_camera as OnCamera | null);
  const [experience, setExperience] = useState(profile.experience_level as ExperienceLevel | null);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [, startTransition] = useTransition();

  const dirty =
    displayName.trim() !== profile.display_name ||
    interests.join() !== profile.interests.join() ||
    onCamera !== profile.on_camera ||
    experience !== profile.experience_level;
  const invalidMessage = !displayName.trim() ? '이름을 입력해 주세요.' : interests.length === 0 ? '관심 분야를 하나 이상 골라 주세요.' : null;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('saving');
    const { error } = await getSupabaseBrowserClient()
      .from('profiles')
      .update({ display_name: displayName.trim(), interests, on_camera: onCamera, experience_level: experience })
      .eq('id', profile.id);
    if (error) {
      setStatus('error');
      return;
    }
    setStatus('saved');
    startTransition(() => router.refresh());
  }

  const footerMessage =
    invalidMessage ?? (status === 'error' ? '저장하지 못했어요. 잠시 후 다시 시도해 주세요.' : null);

  return (
    <form className="cl-stack" onSubmit={save}>
      <Card title="프로필">
        <div className="cl-auth__form">
          <Field htmlFor="settings-name" label="이름">
            <Input
              autoComplete="name"
              id="settings-name"
              maxLength={40}
              onChange={(event) => setDisplayName(event.target.value)}
              value={displayName}
            />
          </Field>
          <Field hint="로그인 이메일은 바꿀 수 없어요." htmlFor="settings-email" label="이메일">
            <Input disabled id="settings-email" readOnly value={email} />
          </Field>
        </div>
      </Card>

      <Card description="최대 3개까지 고를 수 있어요." title="관심 분야">
        <div className="cl-stack-tight">
          <InterestPicker onChange={setInterests} value={interests} />
        </div>
      </Card>

      <Card title="영상에 얼굴이 나오나요?">
        <div aria-label="얼굴 노출" className="cl-option-grid" role="radiogroup">
          {ON_CAMERA_OPTIONS.map((option) => (
            <OptionCard
              description={option.description}
              icon={ON_CAMERA_ICONS[option.id]}
              key={option.id}
              onSelect={() => setOnCamera(option.id)}
              selected={onCamera === option.id}
              title={option.label}
            />
          ))}
        </div>
      </Card>

      <Card title="숏폼 경험">
        <div aria-label="활동 경험" className="cl-option-grid" role="radiogroup">
          {EXPERIENCE_OPTIONS.map((option) => (
            <OptionCard
              description={option.description}
              icon={EXPERIENCE_ICONS[option.id]}
              key={option.id}
              onSelect={() => setExperience(option.id)}
              selected={experience === option.id}
              title={option.label}
            />
          ))}
        </div>
      </Card>

      {(dirty || status !== 'idle') && (
        <StickyFooter message={dirty ? footerMessage : null}>
          {!dirty && status === 'saved' ? (
            <span className="cl-meta">저장했어요</span>
          ) : (
            <Button disabled={!dirty || !!invalidMessage || status === 'saving'} type="submit" variant="primary">
              {status === 'saving' ? '저장 중…' : '변경사항 저장'}
            </Button>
          )}
        </StickyFooter>
      )}
    </form>
  );
}
