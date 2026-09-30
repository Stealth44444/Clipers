'use client';

import type { ReactNode } from 'react';

export function Chip({ selected, onToggle, icon, children, disabled }: { selected: boolean; onToggle: () => void; icon?: ReactNode; children: ReactNode; disabled?: boolean }) {
  return (
    <button aria-pressed={selected} className="cl-chip" disabled={disabled} onClick={onToggle} type="button">
      {icon}
      {children}
    </button>
  );
}
