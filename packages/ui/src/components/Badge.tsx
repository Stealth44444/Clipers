import type { ReactNode } from 'react';
import { cx } from '../lib/cx';

export type Tone = 'neutral' | 'brand' | 'amber' | 'tomato' | 'sky' | 'violet';

export function Badge({ tone = 'neutral', solid, icon, children }: { tone?: Tone; solid?: boolean; icon?: ReactNode; children: ReactNode }) {
  return (
    <span className={cx('cl-badge', `cl-tone-${tone}`, solid && 'cl-badge--solid')}>
      {icon}
      {children}
    </span>
  );
}
