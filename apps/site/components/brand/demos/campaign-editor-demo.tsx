'use client';

import { Clapperboard, Scissors } from 'lucide-react';
import { Chip, OptionCard } from '@clipers/ui';
import { EDITOR_PLATFORMS, EDITOR_SELECTED_PLATFORMS } from '@/lib/brand-demos';

const noop = () => {};

/** The brand app's new-campaign editor at its real size, already filled in: clipping chosen, three platforms on. */
export default function CampaignEditorDemo() {
  return (
    <div className="cl-app-dark cl-crop" inert>
      <p className="cl-crop__heading">콘텐츠</p>
      <div className="cl-option-grid">
        <OptionCard
          description="제공한 영상을 크리에이터가 짧게 편집해 올려요."
          icon={<Scissors size={18} />}
          onSelect={noop}
          selected
          title="클리핑"
        />
        <OptionCard description="크리에이터가 제품·서비스를 직접 소개해요." icon={<Clapperboard size={18} />} onSelect={noop} selected={false} title="UGC" />
      </div>
      <p className="cl-crop__heading">플랫폼</p>
      <div className="cl-chip-group">
        {EDITOR_PLATFORMS.map((label, index) => (
          <Chip key={label} onToggle={noop} selected={index < EDITOR_SELECTED_PLATFORMS}>
            {label}
          </Chip>
        ))}
      </div>
    </div>
  );
}
