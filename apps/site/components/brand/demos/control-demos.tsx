'use client';

import { useId } from 'react';
import { CAMPAIGN_REQUIREMENTS_MAX } from '@clipers/db';
import { Avatar, Field, Input, ProgressBar, StatusDot, SummaryList, Textarea, formatCompactKRW } from '@clipers/ui';
import { useDemoFrame } from '@/components/brand/use-demo-frame';
import { APPLICANT_FRAMES, BUDGET_TOTAL, CAP_FRAMES, REQUIREMENTS_TEXT, budgetFrames } from '@/lib/brand-demos';

// The four crops of the controls bento (spec §4.6), each a piece of the real brand app. None pairs won with views.

const BUDGET_FRAMES = budgetFrames();

export function RequirementsDemo() {
  const id = useId();
  return (
    <div className="cl-app-dark cl-bdemo" inert>
      <Field count={REQUIREMENTS_TEXT.length} hint="검수 기준이 돼요." htmlFor={id} label="요구사항" maxLength={CAMPAIGN_REQUIREMENTS_MAX}>
        <Textarea id={id} readOnly rows={3} value={REQUIREMENTS_TEXT} />
      </Field>
    </div>
  );
}

const CAP_BARS = [
  { label: '하루 · 여름밤 후렴 챌린지', share: 1 },
  { label: '민지 · 여름밤 립싱크', share: 0.64 },
  { label: '도윤 · 퇴근길 여름밤', share: 0.31 },
];

export function ClipCapDemo() {
  const { ref, frame } = useDemoFrame(CAP_FRAMES);
  const id = useId();
  return (
    <div className="cl-app-dark cl-bdemo" inert ref={ref}>
      <Field htmlFor={id} label="클립당 최대 예산 (원)">
        <Input id={id} readOnly value="300000" />
      </Field>
      <ul className="cl-bdemo__bars">
        {CAP_BARS.map((bar) => (
          <li key={bar.label}>
            <span>{bar.label}</span>
            {bar.share === 1 && frame.capped ? <StatusDot tone="gray">상한 도달</StatusDot> : <span />}
            <ProgressBar label="상한 대비" value={frame.filled ? bar.share : 0} />
          </li>
        ))}
      </ul>
    </div>
  );
}

const APPLICANTS = [
  { name: '하루', detail: '음악 · 유튜브 쇼츠' },
  { name: '민지', detail: '뷰티 · 인스타그램 릴스', waits: true },
  { name: '도윤', detail: '음악 · 틱톡' },
  { name: '서아', detail: '댄스 · 네이버 클립' },
];

export function ApplicantsDemo() {
  const { ref, frame: approved } = useDemoFrame(APPLICANT_FRAMES);
  return (
    <div className="cl-app-dark cl-bdemo" inert ref={ref}>
      <p className="cl-bdemo__label">지원한 크리에이터</p>
      <ul className="cl-bdemo__people">
        {APPLICANTS.map((person) => (
          <li key={person.name}>
            <Avatar name={person.name} size="sm" />
            <span className="cl-bdemo__person">
              <span>{person.name}</span>
              <small>{person.detail}</small>
            </span>
            {person.waits && !approved ? (
              <StatusDot pulse tone="yellow">
                검토 중
              </StatusDot>
            ) : (
              <StatusDot tone="green">승인</StatusDot>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function BudgetDemo() {
  const { ref, frame: remaining } = useDemoFrame(BUDGET_FRAMES);
  return (
    <div className="cl-app-dark cl-bdemo" inert ref={ref}>
      <p className="cl-bdemo__label">남은 예산</p>
      <p className="cl-bdemo__big">
        {formatCompactKRW(remaining)} <small>/ {formatCompactKRW(BUDGET_TOTAL)}</small>
      </p>
      <ProgressBar label="예산 사용률" value={1 - remaining / BUDGET_TOTAL} />
      <SummaryList rows={[{ label: '예산을 다 쓰면', value: '캠페인 자동 종료' }]} />
    </div>
  );
}
