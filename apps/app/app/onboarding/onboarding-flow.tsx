'use client';

import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  BadgeCheck,
  ChevronLeft,
  CircleHelp,
  Clapperboard,
  EyeOff,
  FileText,
  Footprints,
  Megaphone,
  Scissors,
  Shield,
  Shuffle,
  Smile,
  Sprout,
  TrendingUp,
  Trophy,
  Wallet,
} from 'lucide-react';
import {
  EXPERIENCE_OPTIONS,
  INTERESTS,
  MAX_INTERESTS,
  ON_CAMERA_OPTIONS,
  canContinueOnboarding,
  emptyOnboardingAnswers,
  onboardingSteps,
  toggleInterest,
  type OnboardingAnswers,
} from '@clipers/db';
import { Badge, Button, Chip, List, ListRow, OptionCard, ProgressBar, Switch } from '@clipers/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

const ICON = { size: 18 };

const CAMERA_ICONS: Record<string, ReactNode> = {
  always: <Smile {...ICON} />,
  sometimes: <Shuffle {...ICON} />,
  never: <EyeOff {...ICON} />,
  undecided: <CircleHelp {...ICON} />,
};

const EXPERIENCE_ICONS: Record<string, ReactNode> = {
  new: <Sprout {...ICON} />,
  beginner: <Footprints {...ICON} />,
  intermediate: <TrendingUp {...ICON} />,
  pro: <Trophy {...ICON} />,
};

export default function OnboardingFlow() {
  const router = useRouter();
  const [answers, setAnswers] = useState<OnboardingAnswers>(emptyOnboardingAnswers);
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
        <img alt="Clipers" src="/logo/clipers-wordmark.svg" />
        <Button onClick={() => void signOut()} size="sm" variant="ghost">
          로그아웃
        </Button>
      </header>
      <div className="cl-flow__progress">
        <ProgressBar label="온보딩 진행도" value={(stepIndex + 1) / steps.length} />
      </div>

      <main className="cl-flow__body">
        {step === 'role' && (
          <Step description="선택한 역할에 맞춰 워크스페이스를 준비해 드려요." title="Clipers에서 무엇을 하고 싶으세요?">
            <div aria-label="역할" className="cl-option-list" role="radiogroup">
              <OptionCard
                badge={<Badge tone="brand">추천</Badge>}
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
                description="브랜드나 아티스트가 제공한 영상을 짧게 편집해 올려요."
                icon={<Scissors {...ICON} />}
                title="클리핑"
                tone="brand"
              />
              <ListRow
                description="제품이나 서비스를 직접 소개하는 영상을 만들어요."
                icon={<Clapperboard {...ICON} />}
                title="UGC"
                tone="sky"
              />
              <ListRow
                description="운영팀 검수를 통과한 클립의 조회수만 정산돼요."
                icon={<BadgeCheck {...ICON} />}
                title="검수와 정산"
                tone="violet"
              />
            </List>
          </Step>
        )}

        {step === 'interests' && (
          <Step
            description={`최대 ${MAX_INTERESTS}개까지 고를 수 있어요. 맞는 캠페인을 추천하는 데 써요.`}
            title="어떤 분야에 관심 있으세요?"
          >
            <div aria-label="관심 분야" className="cl-chip-group" role="group">
              {INTERESTS.map((interest) => {
                const selected = answers.interests.includes(interest.id);
                return (
                  <Chip
                    disabled={!selected && answers.interests.length >= MAX_INTERESTS}
                    key={interest.id}
                    onToggle={() => update({ interests: toggleInterest(answers.interests, interest.id) })}
                    selected={selected}
                  >
                    {interest.label}
                  </Chip>
                );
              })}
            </div>
            <p className="cl-flow__hint">
              {answers.interests.length}/{MAX_INTERESTS} 선택
            </p>
          </Step>
        )}

        {step === 'camera' && (
          <Step description="캠페인마다 조건이 달라서, 맞는 캠페인을 찾는 데 참고해요." title="영상에 얼굴이 나오나요?">
            <div aria-label="얼굴 노출" className="cl-option-grid" role="radiogroup">
              {ON_CAMERA_OPTIONS.map((option) => (
                <OptionCard
                  description={option.description}
                  icon={CAMERA_ICONS[option.id]}
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
          {isLastStep ? (submitting ? '저장 중…' : '시작하기') : '계속'}
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
