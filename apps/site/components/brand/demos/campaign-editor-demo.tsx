'use client';

import { useId } from 'react';
import { Clapperboard, Scissors } from 'lucide-react';
import { Chip, Field, Input, OptionCard, ProgressBar } from '@clipers/ui';
import DemoCursor from '@/components/brand/demo-cursor';
import { useDemoFrame } from '@/components/brand/use-demo-frame';
import { EDITOR_CHIPS, EDITOR_TOTAL_STEPS, editorDone, editorFrames } from '@/lib/brand-demos';

const FRAMES = editorFrames();
const noop = () => {};

/** The brand app's new-campaign editor: pick 클리핑, switch on three platforms, type the budget. No expected views. */
export default function CampaignEditorDemo() {
  const { ref, frame } = useDemoFrame(FRAMES);
  const budgetId = useId();
  const done = editorDone(frame);

  return (
    <div className="cl-app-dark cl-bdemo" inert ref={ref}>
      <div className="cl-bdemo__head">
        <span className="cl-bdemo__title">새 캠페인</span>
        <span className="cl-bdemo__meta">
          {done}/{EDITOR_TOTAL_STEPS} 완료
        </span>
      </div>
      <ProgressBar bare value={done / EDITOR_TOTAL_STEPS} />
      <p className="cl-bdemo__label">콘텐츠</p>
      <div className="cl-option-grid">
        <div data-demo="clipping">
          <OptionCard icon={<Scissors size={18} />} onSelect={noop} selected={frame.clipping} title="클리핑" />
        </div>
        <div>
          <OptionCard icon={<Clapperboard size={18} />} onSelect={noop} selected={false} title="UGC" />
        </div>
      </div>
      <p className="cl-bdemo__label">플랫폼</p>
      <div className="cl-chip-group">
        {EDITOR_CHIPS.map((label, index) => (
          <span data-demo={`chip-${index}`} key={label}>
            <Chip onToggle={noop} selected={index < frame.chips}>
              {label}
            </Chip>
          </span>
        ))}
      </div>
      <Field htmlFor={budgetId} label="총예산 (원)">
        <Input data-demo="budget" id={budgetId} placeholder="1000000" readOnly value={frame.budget} />
      </Field>
      <DemoCursor click={frame.click} stage={ref} target={frame.cursor} />
    </div>
  );
}
