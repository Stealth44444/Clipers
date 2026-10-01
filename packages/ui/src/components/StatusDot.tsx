import type { ReactNode } from 'react';
import { cx } from '../lib/cx';

export type StatusTone = 'green' | 'yellow' | 'red' | 'blue' | 'gray';

/** macOS-style status indicator: a small glowing dot followed by a plain label (no pill). */
export function StatusDot({ tone, children, pulse }: { tone: StatusTone; children: ReactNode; pulse?: boolean }) {
  return (
    <span className={cx('cl-status-dot', `cl-status-dot--${tone}`, pulse && 'cl-status-dot--pulse')}>
      <span aria-hidden className="cl-status-dot__dot" />
      {children}
    </span>
  );
}
