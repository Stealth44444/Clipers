'use client';

import { MAX_INTERESTS, interestsByGroup, toggleInterest } from '@clipers/db';
import { Chip } from '@clipers/ui';
import { INTEREST_ICONS } from '@/lib/interest-icons';

export default function InterestPicker({ value, onChange }: { value: string[]; onChange: (value: string[]) => void }) {
  return (
    <>
      <p aria-live="polite" className="cl-flow__hint">
        {value.length}/{MAX_INTERESTS} 선택
      </p>
      {interestsByGroup().map((group) => (
        <section aria-label={group.label} className="cl-chip-section" key={group.id}>
          <h3 className="cl-chip-section__title">{group.label}</h3>
          <div className="cl-chip-group">
            {group.interests.map((interest) => {
              const Icon = INTEREST_ICONS[interest.id];
              const selected = value.includes(interest.id);
              return (
                <Chip
                  disabled={!selected && value.length >= MAX_INTERESTS}
                  icon={<Icon size={16} />}
                  key={interest.id}
                  onToggle={() => onChange(toggleInterest(value, interest.id))}
                  selected={selected}
                >
                  {interest.label}
                </Chip>
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
}
