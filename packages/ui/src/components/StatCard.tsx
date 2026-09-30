import type { ReactNode } from 'react';
import { cx } from '../lib/cx';
import type { Tone } from './Badge';

export function StatCard({ icon, value, label, tone = 'neutral', highlight }: { icon: ReactNode; value: ReactNode; label: ReactNode; tone?: Tone; highlight?: boolean }) {
  return (
    <div className={cx('cl-stat', `cl-tone-${tone}`, highlight && 'cl-stat--highlight')}>
      <span className="cl-stat__icon">{icon}</span>
      <div>
        <div className="cl-stat__value">{value}</div>
        <div className="cl-stat__label">{label}</div>
      </div>
    </div>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <div className="cl-stat-grid">{children}</div>;
}
