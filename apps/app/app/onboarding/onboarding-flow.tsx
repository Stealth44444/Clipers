'use client';

import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { BadgeCheck, ChevronLeft, Clapperboard, FileText, Megaphone, Scissors, Shield, Wallet } from 'lucide-react';
import {
  EXPERIENCE_OPTIONS,
  HEARD_FROM_OPTIONS,
  MAX_INTERESTS,
  ON_CAMERA_OPTIONS,
  canContinueOnboarding,
  emptyOnboardingAnswers,
  onboardingSteps,
  type OnboardingAnswers,
  type OnboardingRole,
} from '@clipers/db';
import { Button, List, ListRow, OptionCard, ProgressBar, Switch } from '@clipers/ui';
import InterestPicker from '@/components/interest-picker';
import { EXPERIENCE_ICONS, ON_CAMERA_ICONS } from '@/components/profile-option-icons';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import { siteUrl } from '@/lib/urls';

const ICON = { size: 18 };

export default function OnboardingFlow({ initialRole = 'creator' }: { initialRole?: OnboardingRole }) {
  const router = useRouter();
  const [answers, setAnswers] = useState<OnboardingAnswers>(() => ({ ...emptyOnboardingAnswers(), role: initialRole }));
  const [stepIndex, setStepIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const steps = onboardingSteps(answers.role);
  const step = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;
  const update = (patch: Partial<OnboardingAnswers>) => setAnswers((current) => ({ ...current, ...patch }));

  async function complete() {
    setSubmitting(true);
    setError('');
    const supabase = getSupabaseBrowserClient();
    const isCreator = answers.role === 'creator';
    const { error: rpcError } = await supabase.rpc('complete_onboarding', {
      p_role: answers.role,
      p_interests: isCreator ? answers.interests : [],
      p_on_camera: isCreator ? answers.onCamera : null,
      p_experience_level: isCreator ? answers.experienceLevel : null,
      p_heard_from: answers.heardFrom,
    });
    if (rpcError) {
      setError('저장하지 못했습니다. 잠시 후 다시 시도해 주세요.');
      setSubmitting(false);
      return;
    }
    router.replace(answers.role === 'brand' ? '/brand' : '/creator');
    router.refresh();
  }

  async function signOut() {
    await getSupabaseBrowserClient().auth.signOut();
    router.replace('/login');
    router.refresh();
  }

  return (
    <div className="cl-flow">
      <header className="cl-flow__header">
        <a href={siteUrl('/')}>
          <img alt="Clipers" src="/logo/clipers-wordmark.svg" />
        </a>
        <Button onClick={() => void signOut()} size="sm" variant="ghost">
          로그아웃
        </Button>
      </header>
      <div className="cl-flow__progress">
        <ProgressBar bare label="온보딩 진행도" value={(stepIndex + 1) / steps.length} />
      </div>

      <main className="cl-flow__body">
        {step === 'role' && (
          <Step description="선택한 역할에 맞춰 워크스페이스를 준비해 드려요." title="Clipers에서 무엇을 하고 싶으세요?">
            <div aria-label="역할" className="cl-option-list" role="radiogroup">
              <OptionCard
                description="브랜드 캠페인에 숏폼을 올리고, 검증된 조회수만큼 정산받아요."
                icon={<Wallet {...ICON} />}
                onSelect={() => update({ role: 'creator' })}
                selected={answers.role === 'creator'}
                title="수익 창출 시작하기"
              />
              <OptionCard
                description="예산을 걸고 크리에이터들의 숏폼으로 조회수를 모아요."
                icon={<Megaphone {...ICON} />}
                onSelect={() => update({ role: 'brand' })}
                selected={answers.role === 'brand'}
                title="캠페인 개설하기"
              />
            </div>
          </Step>
        )}

        {step === 'earn' && (
          <Step description="캠페인마다 조회수 1,000회당 지급액(CPM)이 정해져 있어요." title="이렇게 수익을 만들어요">
            <List>
              <ListRow
                description="캠페인이 정해 준 영상을 내 방식대로 편집해 올려요."
                icon={<Scissors {...ICON} />}
                title="클리핑"
              />
              <ListRow
                description="제품이나 서비스를 내 스타일대로 소개하는 영상을 찍어요."
                icon={<Clapperboard {...ICON} />}
                title="소개"
              />
              <ListRow
                description="검수를 통과한 클립은 조회수 1,000회부터 정산되고, 그전 조회수도 함께 정산돼요."
                icon={<BadgeCheck {...ICON} />}
                title="검수와 정산"
              />
            </List>
          </Step>
        )}

        {step === 'interests' && (
          <Step
            description={`최대 ${MAX_INTERESTS}개까지 고를 수 있어요. 맞는 캠페인을 추천하는 데 써요.`}
            title="어떤 분야에 관심 있으세요?"
          >
            <InterestPicker onChange={(interests) => update({ interests })} value={answers.interests} />
          </Step>
        )}

        {step === 'camera' && (
          <Step description="캠페인마다 조건이 달라서, 맞는 캠페인을 찾는 데 참고해요." title="영상에 얼굴이 나오나요?">
            <div aria-label="얼굴 노출" className="cl-option-grid" role="radiogroup">
              {ON_CAMERA_OPTIONS.map((option) => (
                <OptionCard
                  description={option.description}
                  icon={ON_CAMERA_ICONS[option.id]}
                  key={option.id}
                  onSelect={() => update({ onCamera: option.id })}
                  selected={answers.onCamera === option.id}
                  title={option.label}
                />
              ))}
            </div>
          </Step>
        )}

        {step === 'experience' && (
          <Step description="경험에 맞는 캠페인과 안내를 보여 드릴게요." title="숏폼 경험이 어느 정도인가요?">
            <div aria-label="활동 경험" className="cl-option-grid" role="radiogroup">
              {EXPERIENCE_OPTIONS.map((option) => (
                <OptionCard
                  description={option.description}
                  icon={EXPERIENCE_ICONS[option.id]}
                  key={option.id}
                  onSelect={() => update({ experienceLevel: option.id })}
                  selected={answers.experienceLevel === option.id}
                  title={option.label}
                />
              ))}
            </div>
          </Step>
        )}

        {step === 'source' && (
          <Step description="건너뛰어도 괜찮아요. Clipers를 더 잘 알리는 데 참고해요." title="Clipers를 어떻게 알게 되셨어요?">
            <div aria-label="알게 된 경로" className="cl-option-list" role="radiogroup">
              {HEARD_FROM_OPTIONS.map((option) => (
                <OptionCard
                  key={option.id}
                  onSelect={() => update({ heardFrom: answers.heardFrom === option.id ? null : option.id })}
                  selected={answers.heardFrom === option.id}
                  title={option.label}
                />
              ))}
            </div>
          </Step>
        )}

        {step === 'terms' && (
          <Step description="동의하면 바로 시작할 수 있어요." title="약관에 동의해 주세요">
            <List>
              <ListRow
                description={<a className="cl-link" href="/terms" rel="noreferrer" target="_blank">내용 보기</a>}
                icon={<FileText {...ICON} />}
                title="이용약관 동의 (필수)"
                trailing={<Switch checked={answers.termsAgreed} label="이용약관 동의" onChange={(termsAgreed) => update({ termsAgreed })} />}
              />
              <ListRow
                description={<a className="cl-link" href="/privacy" rel="noreferrer" target="_blank">내용 보기</a>}
                icon={<Shield {...ICON} />}
                title="개인정보 수집·이용 동의 (필수)"
                trailing={<Switch checked={answers.privacyAgreed} label="개인정보 수집·이용 동의" onChange={(privacyAgreed) => update({ privacyAgreed })} />}
              />
            </List>
            {error && <p className="cl-alert cl-tone-tomato" role="alert">{error}</p>}
          </Step>
        )}
      </main>

      <footer className="cl-flow__footer">
        {stepIndex > 0 ? (
          <Button icon={<ChevronLeft size={16} />} onClick={() => setStepIndex(stepIndex - 1)} size="lg" variant="secondary">
            이전
          </Button>
        ) : (
          <span />
        )}
        <Button
          disabled={!canContinueOnboarding(step, answers) || submitting}
          onClick={() => (isLastStep ? void complete() : setStepIndex(stepIndex + 1))}
          size="lg"
          variant="primary"
        >
          {isLastStep ? (submitting ? '저장 중…' : '시작하기') : step === 'source' && answers.heardFrom === null ? '건너뛰기' : '계속'}
        </Button>
      </footer>
    </div>
  );
}

function Step({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <>
      <div>
        <h1 className="cl-flow__title">{title}</h1>
        <p className="cl-flow__description">{description}</p>
      </div>
      {children}
    </>
  );
}
