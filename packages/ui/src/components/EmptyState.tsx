import type { ReactNode } from 'react';
import { cx } from '../lib/cx';
import type { Tone } from './Badge';

export function EmptyState({ icon, title, description, action, tone = 'brand' }: { icon: ReactNode; title: ReactNode; description?: ReactNode; action?: ReactNode; tone?: Tone }) {
  return (
    <div className={cx('cl-empty', `cl-tone-${tone}`)}>
      <span className="cl-empty__icon">{icon}</span>
      <p className="cl-empty__title">{title}</p>
      {description && <p className="cl-empty__description">{description}</p>}
      {action && <div className="cl-empty__action">{action}</div>}
    </div>
  );
}
