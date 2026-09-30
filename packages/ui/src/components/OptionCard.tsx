'use client';

import type { ReactNode } from 'react';
import { Check } from 'lucide-react';

export function OptionCard({ icon, title, description, badge, selected, onSelect }: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  badge?: ReactNode;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button aria-checked={selected} className="cl-option-card" onClick={onSelect} role="radio" type="button">
      {icon && <span className="cl-option-card__icon">{icon}</span>}
      <span className="cl-option-card__radio" aria-hidden>{selected && <Check size={12} strokeWidth={3} />}</span>
      <span className="cl-option-card__title">
        {title}
        {badge}
      </span>
      {description && <span className="cl-option-card__description">{description}</span>}
    </button>
  );
}
