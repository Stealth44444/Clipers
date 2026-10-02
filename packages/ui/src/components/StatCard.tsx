import type { ReactNode } from 'react';
import { cx } from '../lib/cx';

/** A label over one number. `highlight` marks the figure that matters most on the page (the number takes the brand colour). */
export function StatCard({ value, label, highlight }: { value: ReactNode; label: ReactNode; highlight?: boolean }) {
  return (
    <div className={cx('cl-stat', highlight && 'cl-stat--highlight')}>
      <div className="cl-stat__label">{label}</div>
      <div className="cl-stat__value">{value}</div>
    </div>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <div className="cl-stat-grid">{children}</div>;
}
